export const fmt = (v: number, c: "PEN" | "USD" = "PEN") =>
  `${c === "USD" ? "$ " : "S/ "}${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)}`;

export const fmtP = (v: number) => `${(v * 100).toFixed(4)}%`;
export const fmtPs = (v: number) => `${(v * 100).toFixed(2)}%`;
export const n2 = (v: number) => v.toFixed(2);