import { Tool, z } from "../core/tool.js";

// ─── Currency Converter Tool ──────────────────────────────────────────────────
// Uses a static USD-base rate table (no API key needed).
// Rates as approximate real-world values (last updated build time).

const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 149.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.90,
  CNY: 7.24,
  SGD: 1.34,
  AED: 3.67,
  MXN: 17.2,
  BRL: 4.97,
  KRW: 1330,
  SEK: 10.42,
  NOK: 10.57,
  DKK: 6.88,
  NZD: 1.63,
  ZAR: 18.63,
  HKD: 7.82,
  THB: 35.1,
  IDR: 15_650,
  MYR: 4.72,
  PHP: 56.5,
  PKR: 278,
  BDT: 110,
  NGN: 1580,
  EGP: 48.5,
  TRY: 32.1,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.376,
};

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  INR: "Indian Rupee",
  JPY: "Japanese Yen",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  SGD: "Singapore Dollar",
  AED: "UAE Dirham",
  MXN: "Mexican Peso",
  BRL: "Brazilian Real",
  KRW: "South Korean Won",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  NZD: "New Zealand Dollar",
  ZAR: "South African Rand",
  HKD: "Hong Kong Dollar",
  THB: "Thai Baht",
  IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit",
  PHP: "Philippine Peso",
  PKR: "Pakistani Rupee",
  BDT: "Bangladeshi Taka",
  NGN: "Nigerian Naira",
  EGP: "Egyptian Pound",
  TRY: "Turkish Lira",
  SAR: "Saudi Riyal",
  QAR: "Qatari Riyal",
  KWD: "Kuwaiti Dinar",
  BHD: "Bahraini Dinar",
};

const currencySchema = z.object({
  amount: z.number().positive("amount must be a positive number").describe("The amount to convert"),
  from: z.string().length(3).toUpperCase().describe("Source currency code (ISO 4217, e.g. USD)"),
  to: z.string().length(3).toUpperCase().describe("Target currency code (ISO 4217, e.g. INR)"),
});

export const currencyConverterTool = new Tool({
  name: "currencyConverter",
  description:
    "Convert between world currencies using approximate exchange rates (30+ currencies supported: USD, EUR, GBP, INR, JPY, AUD, CAD, CHF, CNY, SGD, AED, etc.)",
  inputDescription: 'JSON object with "amount", "from", and "to" fields (ISO 4217 currency codes)',
  examples: [
    '{"amount": 100, "from": "USD", "to": "INR"}',
    '{"amount": 50, "from": "EUR", "to": "GBP"}',
    '{"amount": 1000, "from": "JPY", "to": "USD"}',
  ],
  inputSchema: currencySchema,
  func: async ({ amount, from, to }) => {
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();

    if (!USD_RATES[fromCode]) {
      const supported = Object.keys(USD_RATES).join(", ");
      return `Unknown currency: "${fromCode}". Supported currencies: ${supported}`;
    }
    if (!USD_RATES[toCode]) {
      const supported = Object.keys(USD_RATES).join(", ");
      return `Unknown currency: "${toCode}". Supported currencies: ${supported}`;
    }

    // Convert via USD as base
    const inUSD = amount / USD_RATES[fromCode];
    const result = inUSD * USD_RATES[toCode];

    const fromName = CURRENCY_NAMES[fromCode] ?? fromCode;
    const toName = CURRENCY_NAMES[toCode] ?? toCode;

    // Format: use locale-appropriate precision
    const formatted = result >= 1 ? result.toFixed(2) : result.toFixed(6).replace(/\.?0+$/, "");

    return (
      `${amount} ${fromName} (${fromCode}) = ${formatted} ${toName} (${toCode})\n` +
      `  Rate: 1 ${fromCode} ≈ ${(USD_RATES[toCode] / USD_RATES[fromCode]).toFixed(4)} ${toCode}\n` +
      `  (Rates are approximate and for reference only)`
    );
  },
});
