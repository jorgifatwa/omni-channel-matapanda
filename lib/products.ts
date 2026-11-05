export type CurrencyCode = "IDR" | "USD" | "SGD" | "JPY";

export const CURRENCIES: {
  code: CurrencyCode;
  label: string;
  rateFromIDR: number;
}[] = [
  { code: "IDR", label: "IDR", rateFromIDR: 1 },
  { code: "USD", label: "USD", rateFromIDR: 1 / 15800 },
  { code: "SGD", label: "SGD", rateFromIDR: 1 / 11800 },
  { code: "JPY", label: "JPY", rateFromIDR: 1 / 105 },
];

export function formatIDR(amount: number): string {
  return `${amount.toLocaleString("id-ID")} IDR`;
}

export function formatPriceByCurrency(
  amountInIDR: number,
  currency: CurrencyCode
): string {
  switch (currency) {
    case "USD": {
      const converted = amountInIDR / 15800;
      return `$${converted.toFixed(2)} USD`;
    }
    case "SGD": {
      const converted = amountInIDR / 11800;
      return `S$${converted.toFixed(2)} SGD`;
    }
    case "JPY": {
      const converted = Math.round(amountInIDR / 105);
      return `¥${converted.toLocaleString("en-US")} JPY`;
    }
    case "IDR":
    default:
      return `${amountInIDR.toLocaleString("id-ID")} IDR`;
  }
}
