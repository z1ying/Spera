/** $9.50M above a million, otherwise whole dollars. */
export const money = (x: number) =>
  Math.abs(x) >= 1e6 ? `$${(x / 1e6).toFixed(2)}M` : `$${Math.round(x).toLocaleString("en-US")}`;
