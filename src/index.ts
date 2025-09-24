import * as sdk from '@botpress/sdk'
import * as bp from '.botpress'

async function fetchJson(url: string, headers: Record<string, string>) {
	const res = await (globalThis.fetch as any)(url, { headers })
	if (!res || !res.ok) {
		const status = res && typeof res.status === 'number' ? res.status : 'unknown'
		throw new sdk.RuntimeError(`API request failed with status ${status}`)
	}
	return (await res.json()) as any
}

function normalizeCurrency(code: string | undefined, fallback?: string) {
	const value = (code ?? fallback ?? '').trim().toUpperCase()
	if (!value || value.length !== 3) {
		throw new sdk.RuntimeError('Invalid currency code')
	}
	return value
}

function buildRateUrl(baseUrl: string, apiKey: string | undefined, baseCurrency: string, targetCurrency: string) {
	const trimmed = baseUrl.replace(/\/$/, '')
	const host = new URL(trimmed).hostname
	if (host.includes('exchangerate-api.com')) {
		if (!apiKey) throw new sdk.RuntimeError('Missing apiKey for exchangerate-api.com')
		// https://v6.exchangerate-api.com/v6/<API_KEY>/latest/<BASE>
		return {
			url: `${trimmed}/${encodeURIComponent(apiKey)}/latest/${encodeURIComponent(baseCurrency)}`,
			headers: {} as Record<string, string>,
			provider: host,
			parser: (json: any) => (json && json.conversion_rates ? json.conversion_rates[targetCurrency] : undefined)
		}
	}
	// Default: exchangerate.host style
	return {
		url: `${trimmed}/latest?base=${encodeURIComponent(baseCurrency)}&symbols=${encodeURIComponent(targetCurrency)}`,
		headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : ({} as Record<string, string>),
		provider: host,
		parser: (json: any) => {
			if (json && json.rates && typeof json.rates[targetCurrency] === 'number') return json.rates[targetCurrency]
			if (json && json.data && typeof json.data[targetCurrency] === 'number') return json.data[targetCurrency]
			return undefined
		}
	}
}

function parseMessage(message: string) {
	const text = (message || '').trim()
	// Positional groups: 1=amount, 2=from?, 3=to
	const pattern = /(\d+(?:[.,]\d+)?)\s*([A-Za-z]{3})?\s*(?:to|in|->)?\s*([A-Za-z]{3})/i
	const match = pattern.exec(text)
	if (!match) return null
	const amountRaw = match[1]
	const fromRaw = match[2] || ''
	const toRaw = match[3]
	if (!amountRaw || !toRaw) return null
	return {
		amount: Number(String(amountRaw).replace(',', '.')),
		from: fromRaw,
		to: toRaw
	}
}

export default new bp.Integration({
	register: async ({ ctx }: any) => {
		const baseUrl = ctx.configuration.apiBaseUrl?.trim()
		if (!baseUrl) {
			throw new sdk.RuntimeError('Missing apiBaseUrl in configuration')
		}
		// Optionally probe the provider
		try {
			const headers: Record<string, string> = {}
			if (ctx.configuration.apiKey) headers['Authorization'] = `Bearer ${ctx.configuration.apiKey}`
			await (globalThis.fetch as any)(baseUrl, { method: 'HEAD', headers }).catch(() => {})
		} catch (err) {
			// Non-fatal
		}
	},
	unregister: async () => {
		// Nothing to tear down for a simple HTTP API
	},
	actions: ({
		getRate: async ({ ctx, input }: any) => {
			const from = normalizeCurrency(input.from)
			const to = normalizeCurrency(input.to)

			const { url, headers, provider, parser } = buildRateUrl(ctx.configuration.apiBaseUrl, ctx.configuration.apiKey, from, to)
			const json = await fetchJson(url, headers)
			const rate = parser(json)
			if (typeof rate !== 'number') {
				throw new sdk.RuntimeError('Could not parse rate from provider response')
			}
			return { rate, provider }
		},
		convertAmount: async ({ ctx, input }: any) => {
			const amount = Number(input.amount)
			if (!Number.isFinite(amount) || amount < 0) {
				throw new sdk.RuntimeError('Amount must be a non-negative number')
			}
			const from = normalizeCurrency(input.from, ctx.configuration.defaultBase)
			const to = normalizeCurrency(input.to)

			const { url, headers, provider, parser } = buildRateUrl(ctx.configuration.apiBaseUrl, ctx.configuration.apiKey, from, to)
			const json = await fetchJson(url, headers)
			const rate = parser(json)
			if (typeof rate !== 'number') {
				throw new sdk.RuntimeError('Could not parse rate from provider response')
			}
			const converted = amount * rate
			return { amount, rate, converted, provider }
		},
		parseAndConvert: async ({ ctx, input }: any) => {
			const parsed = parseMessage(String(input.message || ''))
			if (!parsed) {
				throw new sdk.RuntimeError('Could not parse message. Try e.g., "120 USD to EUR"')
			}
			const amount = Number(parsed.amount)
			if (!Number.isFinite(amount) || amount < 0) {
				throw new sdk.RuntimeError('Amount must be a non-negative number')
			}
			const from = normalizeCurrency(parsed.from || undefined, ctx.configuration.defaultBase)
			const to = normalizeCurrency(parsed.to)

			const { url, headers, provider, parser } = buildRateUrl(ctx.configuration.apiBaseUrl, ctx.configuration.apiKey, from, to)
			const json = await fetchJson(url, headers)
			const rate = parser(json)
			if (typeof rate !== 'number') {
				throw new sdk.RuntimeError('Could not parse rate from provider response')
			}
			const converted = amount * rate
			return { amount, rate, converted, provider, from, to }
		}
	}) as any,
	channels: {},
	handler: async () => {}
})
