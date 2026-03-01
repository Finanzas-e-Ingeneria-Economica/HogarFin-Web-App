import type { SimResults } from "./types";
import { n2, fmtP, fmtPs } from "./format";

export function exportExcel(
  r: SimResults,
  cur: "PEN" | "USD",
  bank: string,
  client: string,
  prop: string
) {
  const sym = cur === "USD" ? "$" : "S/";
  const meta = [
    ["SIMULACIÓN HOGARFIN – CRÉDITO MIVIVIENDA"],
    [],
    ["Cliente:", client],
    ["Inmueble:", prop],
    ["Entidad:", bank],
    ["Moneda:", "PEN (calculado)"],
    ["Principal:", `${sym} ${n2(r.principal)}`],
    ["TEM:", fmtP(r.tem)],
    ["TCEA:", r.tcea > 0 ? fmtPs(r.tcea) : "N/D"],
    ["VAN:", `${sym} ${n2(r.van)}`],
    ["TIR mensual:", r.tirM > 0 ? fmtPs(r.tirM) : "N/D"],
    ["Cuota:", `${sym} ${n2(r.monthlyPayment)}`],
    [],
    ["N°", "Tipo", "Interés", "Amortización", "Cuota", "Desgravamen", "Seg.Inmueble", "Portes", "Saldo Final", "Flujo"],
    ...r.schedule.map((s) => [
      s.period,
      s.isGrace ? "GRACIA" : "NORMAL",
      n2(s.interest),
      n2(s.amort),
      n2(s.basePayment),
      n2(s.desgravamen),
      n2(s.propertyInsurance),
      n2(s.monthlyFees),
      n2(s.balance),
      n2(s.cashflow),
    ]),
  ];

  const csv = meta.map((row) => row.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `HogarFin_${client.replace(/\s/g, "_")}.csv`;
  a.click();
}

export function exportPDF(
  r: SimResults,
  cur: "PEN" | "USD",
  bank: string,
  client: string,
  prop: string,
  termYears: number,
  rateType: string,
  annualRate: string,
  cok: string
) {
  const sym = "S/";
  const rows = r.schedule
    .map(
      (s) => `<tr class="${s.isGrace ? "grace" : ""}">
<td>${s.period}${s.isGrace ? ' <span class="badge">G</span>' : ""}</td>
<td>${sym} ${n2(s.interest)}</td>
<td>${sym} ${n2(s.amort)}</td>
<td>${sym} ${n2(s.basePayment)}</td>
<td>${sym} ${n2(s.desgravamen)}</td>
<td>${sym} ${n2(s.propertyInsurance)}</td>
<td>${sym} ${n2(s.balance)}</td>
<td><strong>${sym} ${n2(s.cashflow)}</strong></td>
</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Simulación HogarFin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:24px}
h1{font-size:18px;color:#16a34a;margin-bottom:4px}.sub{font-size:12px;color:#64748b;margin-bottom:20px}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}
.mi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px}
.mi .l{font-size:10px;color:#94a3b8;margin-bottom:2px}.mi .v{font-weight:700;font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px}
.kpi{border-radius:8px;padding:10px;text-align:center}
.green{background:#f0fdf4;border:1px solid #bbf7d0}.blue{background:#f0f9ff;border:1px solid #bae6fd}
.purple{background:#faf5ff;border:1px solid #e9d5ff}.orange{background:#fffbeb;border:1px solid #fde68a}
.kpi .kl{font-size:9px;color:#64748b;margin-bottom:4px}.kpi .kv{font-size:14px;font-weight:800}
table{width:100%;border-collapse:collapse}
th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;color:#475569;border-bottom:2px solid #e2e8f0}
td{padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:10px}
tr.grace td{background:#fffbeb}
.badge{background:#fde68a;color:#92400e;border-radius:4px;padding:1px 4px;font-size:9px}
</style></head><body>
<h1>🏠 HogarFin — Simulación Crédito MiVivienda</h1>
<div class="sub">Generado el ${new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"})}</div>
<div class="meta">
  <div class="mi"><div class="l">Cliente</div><div class="v">${client}</div></div>
  <div class="mi"><div class="l">Inmueble</div><div class="v">${prop}</div></div>
  <div class="mi"><div class="l">Entidad</div><div class="v">${bank}</div></div>
  <div class="mi"><div class="l">Moneda guardada</div><div class="v">PEN</div></div>
  <div class="mi"><div class="l">Tipo tasa</div><div class="v">${rateType} ${annualRate}%</div></div>
  <div class="mi"><div class="l">Plazo</div><div class="v">${termYears} años · ${termYears * 12} meses</div></div>
  <div class="mi"><div class="l">Principal</div><div class="v">${sym} ${n2(r.principal)}</div></div>
  <div class="mi"><div class="l">COK anual</div><div class="v">${cok}%</div></div>
  ${r.exchangeRateUsed !== 1 ? `<div class="mi"><div class="l">T.C. usado</div><div class="v">${n2(r.exchangeRateUsed)} PEN/USD</div></div>` : "<div></div>"}
</div>

<table>
  <thead><tr><th>N°</th><th>Interés</th><th>Amortización</th><th>Cuota</th><th>Desgravamen</th><th>Seg.Inmueble</th><th>Saldo Final</th><th>Flujo</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div style="margin-top:16px;font-size:9px;color:#94a3b8">G = Período de gracia | HogarFin</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}