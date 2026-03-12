export const formatCurrency = (amount: number, currency: "PEN" | "USD") => {
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  return currency === "USD" ? `$ ${n}` : `S/ ${n}`;
};

export const formatArea = (v: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);