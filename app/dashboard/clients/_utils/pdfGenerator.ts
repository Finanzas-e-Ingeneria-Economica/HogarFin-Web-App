import { supabase } from "@/lib/supabaseClient";
import type { ClientRow } from "../page";

export const money = (v: number | null | undefined) => {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(v);
};

export async function generarFichaCliente(client: ClientRow) {
  const { data: simsRaw } = await supabase
    .from("loan_simulations")
    .select(
      "id,principal,monthly_payment,monthly_rate,tcea,van,tir,term_months,annual_rate_used,rate_type_used,grace_type,grace_months,properties(name,location),financial_entities(name)"
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const sim = simsRaw?.[0] as any ?? null;

  let rows: any[] = [];
  if (sim) {
    const { data: rowsRaw } = await supabase
      .from("schedule_rows")
      .select("n,interest,amortization,base_payment,payment,desgravamen,property_insurance,monthly_fees,total_payment,balance,is_grace_period")
      .eq("simulation_id", sim.id)
      .order("n");
    rows = rowsRaw ?? [];
  }

  const fmtS  = (v: number) => `S/ ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0)}`;
  const fmtPs = (v: number) => `${((v ?? 0) * 100).toFixed(2)}%`;
  const fmtP4 = (v: number) => `${((v ?? 0) * 100).toFixed(4)}%`;

  const tableRows = rows.map((r) => `
    <tr class="${r.is_grace_period ? "grace" : ""}">
      <td>${r.n}${r.is_grace_period ? ' <span class="badge">G</span>' : ""}</td>
      <td>${fmtS(r.interest ?? 0)}</td>
      <td>${fmtS(r.amortization ?? 0)}</td>
      <td>${fmtS(r.base_payment ?? r.payment ?? 0)}</td>
      <td>${fmtS(r.desgravamen ?? 0)}</td>
      <td>${fmtS(r.property_insurance ?? 0)}</td>
      <td>${fmtS(r.monthly_fees ?? 0)}</td>
      <td><strong>${fmtS(r.total_payment ?? r.payment ?? 0)}</strong></td>
      <td>${fmtS(r.balance ?? 0)}</td>
    </tr>`).join("");

  const simSection = sim ? `
    <div class="section">
      <div class="section-title">Inmueble y Financiamiento</div>
      <div class="grid3">
        <div class="field"><div class="label">Inmueble</div><div class="value">${sim.properties?.name ?? "—"}</div></div>
        <div class="field"><div class="label">Ubicación</div><div class="value">${sim.properties?.location ?? "—"}</div></div>
        <div class="field"><div class="label">Entidad financiera</div><div class="value">${sim.financial_entities?.name ?? "—"}</div></div>
        <div class="field"><div class="label">Principal</div><div class="value">${fmtS(sim.principal)}</div></div>
        <div class="field"><div class="label">Plazo</div><div class="value">${sim.term_months / 12} años (${sim.term_months} meses)</div></div>
        <div class="field"><div class="label">Tipo de tasa</div><div class="value">${sim.rate_type_used} ${((sim.annual_rate_used ?? 0) * 100).toFixed(2)}%</div></div>
        <div class="field"><div class="label">TEM</div><div class="value">${fmtP4(sim.monthly_rate)}</div></div>
        <div class="field"><div class="label">Gracia</div><div class="value">${sim.grace_type === "NONE" ? "Sin gracia" : `${sim.grace_type === "TOTAL" ? "Total" : "Parcial"} · ${sim.grace_months}m`}</div></div>
        <div class="field"><div class="label">Simulación N°</div><div class="value">#${sim.id}</div></div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi green"><div class="kl">Cuota base mensual</div><div class="kv">${fmtS(sim.monthly_payment)}</div></div>
      <div class="kpi purple"><div class="kl">TCEA</div><div class="kv">${sim.tcea ? fmtPs(sim.tcea) : "N/D"}</div></div>
      <div class="kpi ${(sim.van ?? 0) >= 0 ? "green" : "orange"}"><div class="kl">VAN del préstamo</div><div class="kv">${fmtS(sim.van ?? 0)}</div></div>
      <div class="kpi blue"><div class="kl">TIR mensual</div><div class="kv">${sim.tir ? fmtP4(Math.pow(1 + sim.tir, 1 / 12) - 1) : "N/D"}</div></div>
    </div>

    ${rows.length > 0 ? `
    <div class="section">
      <div class="section-title">Cronograma de Pagos (${rows.length} períodos)</div>
      <table>
        <thead>
          <tr>
            <th>N°</th><th>Interés</th><th>Amortiz.</th><th>Cuota</th>
            <th>Desgrav.</th><th>Seg.Inmueble</th><th>Gastos</th><th>Total</th><th>Saldo</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>` : ""}
  ` : `
    <div class="section">
      <div class="no-sim">Este cliente aún no tiene simulaciones guardadas.</div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ficha Cliente — ${client.names} ${client.last_names}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px }
    .header { background: linear-gradient(135deg,#16a34a,#059669); color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center }
    .header h1 { font-size: 20px; font-weight: 800 }
    .header p { font-size: 11px; opacity: .85; margin-top: 2px }
    .header-right { text-align: right; font-size: 11px; opacity: .9 }
    .section { margin-bottom: 18px }
    .section-title { font-size: 11px; font-weight: 700; color: #16a34a; border-bottom: 2px solid #dcfce7; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .5px }
    .grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px }
    .field { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px }
    .field .label { font-size: 9px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: .3px }
    .field .value { font-size: 12px; font-weight: 700; color: #1e293b }
    .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 18px }
    .kpi { border-radius: 8px; padding: 10px; text-align: center }
    .kpi.green  { background: #f0fdf4; border: 1px solid #bbf7d0 }
    .kpi.blue   { background: #f0f9ff; border: 1px solid #bae6fd }
    .kpi.purple { background: #faf5ff; border: 1px solid #e9d5ff }
    .kpi.orange { background: #fffbeb; border: 1px solid #fde68a }
    .kpi .kl { font-size: 9px; color: #64748b; margin-bottom: 3px }
    .kpi .kv { font-size: 14px; font-weight: 800 }
    table { width: 100%; border-collapse: collapse; font-size: 9px }
    th { background: #f1f5f9; padding: 5px 6px; text-align: right; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0 }
    th:first-child { text-align: center }
    td { padding: 3.5px 6px; border-bottom: 1px solid #f1f5f9; text-align: right }
    td:first-child { text-align: center }
    tr.grace td { background: #fffbeb }
    tr:hover td { background: #f8fafc }
    .badge { background: #fde68a; color: #92400e; border-radius: 3px; padding: 1px 3px; font-size: 7px; font-weight: 700 }
    .no-sim { text-align: center; padding: 20px; color: #94a3b8; font-style: italic }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between }
  </style>
</head>
<body>

<div class="header">
  <div>
    <h1>🏠 HogarFin</h1>
    <p>Ficha de Cliente — Crédito MiVivienda</p>
  </div>
  <div class="header-right">
    <div>${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</div>
    ${sim ? `<div>Simulación #${sim.id}</div>` : ""}
  </div>
</div>

<div class="section">
  <div class="section-title">Datos del Cliente</div>
  <div class="grid3">
    <div class="field"><div class="label">Nombres completos</div><div class="value">${client.names} ${client.last_names}</div></div>
    <div class="field"><div class="label">DNI</div><div class="value">${client.dni}</div></div>
    <div class="field"><div class="label">Teléfono</div><div class="value">${client.phone ?? "—"}</div></div>
    <div class="field"><div class="label">Email</div><div class="value">${client.email ?? "—"}</div></div>
    <div class="field"><div class="label">Ingreso mensual</div><div class="value">${money(client.monthly_income)}</div></div>
    <div class="field"><div class="label">Egreso mensual</div><div class="value">${money(client.monthly_expenses)}</div></div>
    <div class="field"><div class="label">Dependientes</div><div class="value">${client.dependents}</div></div>
    <div class="field"><div class="label">Ocupación</div><div class="value">${client.occupation ?? "—"}</div></div>
    <div class="field"><div class="label">Residencia</div><div class="value">${client.residence_location ?? "—"}</div></div>
    <div class="field"><div class="label">Nivel educativo</div><div class="value">${client.education_level ?? "—"}</div></div>
    <div class="field"><div class="label">Rango ingresos</div><div class="value">${client.income_range ?? "—"}</div></div>
  </div>
</div>

${simSection}

<div class="footer">
  <span>HogarFin — Crédito MiVivienda &nbsp;|&nbsp; Generado el ${new Date().toLocaleDateString("es-PE")}</span>
  <span>G = Período de gracia &nbsp;|&nbsp; Valores en Soles (PEN)</span>
</div>

</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("El navegador bloqueó la ventana emergente. Permite los pop-ups para este sitio.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 700);
}