# Currency Conversion Integration

Fetch FX rates and convert amounts using a configurable provider (e.g., exchangerate.host).

## Configuration
- **API Base URL**: Base endpoint, e.g. `https://api.exchangerate.host`
- **API Key** (optional): If your provider requires it (sent as `Authorization: Bearer <key>`)
- **Default Base Currency** (optional): 3-letter code, e.g. `USD`

## Actions

### getRate
- **Input**: `{ from: 'USD', to: 'EUR' }`
- **Output**: `{ rate: number, provider: string }`

### convertAmount
- **Input**: `{ amount: 100, from: 'USD', to: 'EUR' }`
- **Output**: `{ amount: 100, rate: number, converted: number, provider: string }`

## Notes
- Uses `GET /latest?base=<FROM>&symbols=<TO>`
- Currencies are normalized to 3-letter uppercase codes.
- Errors include missing config, invalid currency codes, or unrecognized provider response.
