import { IntegrationDefinition, z } from '@botpress/sdk'
import { integrationName } from './package.json'

export default new IntegrationDefinition({
  name: integrationName,
  version: '0.1.0',
  readme: 'hub.md',
  icon: 'icon.svg',
  configuration: {
    schema: z.object({
      apiBaseUrl: z
        .string()
        .min(1, 'API Base URL is required')
        .describe('Base URL of the currency rates API (e.g., https://api.exchangerate.host)'),
      apiKey: z
        .string()
        .optional()
        .describe('Optional API key if your provider requires it'),
      defaultBase: z
        .string()
        .length(3, 'Must be a 3-letter currency code')
        .optional()
        .describe('Default base currency code (e.g., USD)')
    })
  },
  actions: {
    getRate: {
      title: 'Get Exchange Rate',
      description: 'Fetch the latest exchange rate from one currency to another',
      input: {
        schema: z.object({
          from: z.string().length(3, '3-letter code'),
          to: z.string().length(3, '3-letter code')
        })
      },
      output: {
        schema: z.object({
          rate: z.number(),
          provider: z.string()
        })
      }
    },
    convertAmount: {
      title: 'Convert Amount',
      description: 'Convert an amount from one currency to another using the latest rate',
      input: {
        schema: z.object({
          amount: z.number().nonnegative(),
          from: z.string().length(3).optional(),
          to: z.string().length(3)
        })
      },
      output: {
        schema: z.object({
          amount: z.number(),
          rate: z.number(),
          converted: z.number(),
          provider: z.string()
        })
      }
    }
  }
})
