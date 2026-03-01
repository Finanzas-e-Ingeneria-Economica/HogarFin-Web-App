"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Calculator,
  User,
  Building2,
  TrendingUp,
  FileText,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
} from "lucide-react";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type Client = { id: number; names: string; last_names: string; dni: string };
type Property = { id: number; name: string; price: number; currency: "PEN" | "USD"; initial_payment: number; location: string };
type Entity = { id: number; name: string };

type ScheduleRow = {
  period: number;
  balance: number;
  interest: number;
  amort: number;
  basePayment: number;
  desgravamen: number;
  propertyInsurance: number;
  monthlyFees: number;
  totalPayment: number;
  cashflow: number;
  isGrace: boolean;
};

type SimResults = {
  monthlyPayment: number;
  tem: number;
  tcea: number;
  van: number;
  tir: number;
  schedule: ScheduleRow[];
  principal: number;
  annualRate: number;
  rateType: string;
  currency: "PEN" | "USD";
  exchangeRateUsed: number;
  principalPEN: number;
};

// ─────────────────────────────────────────────
// HELPERS FINANCIEROS
// ─────────────────────────────────────────────
function calcTEM(rateType: "TEA" | "TNA", annualRate: number, capPerYear: number): number {
  if (rateType === "TEA") return Math.pow(1 + annualRate, 1 / 12) - 1;
  const tea = Math.pow(1 + annualRate / capPerYear, capPerYear) - 1;
  return Math.pow(1 + tea, 1 / 12) - 1;
}

function calcCuota(principal: number, tem: number, n: number): number {
  if (n <= 0) return 0;
  if (tem === 0) return principal / n;
  return (principal * tem) / (1 - Math.pow(1 + tem, -n));
}

function calcVAN(principal: number, cashflows: number[], cokMonthly: number): number {
  let pv = 0;
  for (let t = 0; t < cashflows.length; t++) {
    pv += cashflows[t] / Math.pow(1 + cokMonthly, t + 1);
  }
  return -principal + pv;
}

function calcTIR(principal: number, cashflows: number[]): number {
  let a = 0.000001, b = 1;
  const vanFn = (r: number) => {
    let pv = 0;
    for (let t = 0; t < cashflows.length; t++) pv += cashflows[t] / Math.pow(1 + r, t + 1);
    return -principal + pv;
  };
  if (vanFn(a) * vanFn(b) > 0) return -1;
  for (let i = 0; i < 200; i++) {
    const mid = (a + b) / 2;
    if (Math.abs(vanFn(mid)) < 0.0000001) return mid;
    if (vanFn(a) * vanFn(mid) < 0) b = mid; else a = mid;
  }
  return (a + b) / 2;
}

function generateSchedule(
  principal: number, tem: number, totalMonths: number,
  graceTotal: number, gracePartial: number,
  desgravamenRate: number, propInsAnnual: number,
  propertyValue: number, monthlyFees: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let balance = principal;

  // Gracia total: capitaliza intereses
  for (let i = 1; i <= graceTotal; i++) {
    const interest = balance * tem;
    balance += interest;
    const desgravamen = balance * desgravamenRate;
    const propIns = (propertyValue * propInsAnnual) / 12;
    const total = desgravamen + propIns + monthlyFees;
    rows.push({ period: i, balance, interest, amort: 0, basePayment: 0, desgravamen, propertyInsurance: propIns, monthlyFees, totalPayment: total, cashflow: -total, isGrace: true });
  }

  // Gracia parcial: paga solo intereses
  for (let i = graceTotal + 1; i <= graceTotal + gracePartial; i++) {
    const interest = balance * tem;
    const desgravamen = balance * desgravamenRate;
    const propIns = (propertyValue * propInsAnnual) / 12;
    const total = interest + desgravamen + propIns + monthlyFees;
    rows.push({ period: i, balance, interest, amort: 0, basePayment: interest, desgravamen, propertyInsurance: propIns, monthlyFees, totalPayment: total, cashflow: -total, isGrace: true });
  }

  // Cuota normal
  const n = Math.max(1, totalMonths - graceTotal - gracePartial);
  const cuota = calcCuota(balance, tem, n);

  for (let i = graceTotal + gracePartial + 1; i <= totalMonths; i++) {
    const interest = balance * tem;
    let amort = cuota - interest;
    if (amort < 0) amort = 0;
    balance = Math.max(0, balance - amort);
    const desgravamen = balance * desgravamenRate;
    const propIns = (propertyValue * propInsAnnual) / 12;
    const total = cuota + desgravamen + propIns + monthlyFees;
    rows.push({ period: i, balance, interest, amort, basePayment: cuota, desgravamen, propertyInsurance: propIns, monthlyFees, totalPayment: total, cashflow: -total, isGrace: false });
  }

  return rows;
}

// ─────────────────────────────────────────────
// FORMATEADORES
// ─────────────────────────────────────────────
const fmt = (v: number, cur: "PEN" | "USD" = "PEN") =>
  `${cur === "USD" ? "$ " : "S/ "}${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
const fmtPct = (v: number) => `${(v * 100).toFixed(4)}%`;
const fmtPctShort = (v: number) => `${(v * 100).toFixed(2)}%`;
const n2 = (v: number) => v.toFixed(2);

// ─────────────────────────────────────────────
// EXPORTACIÓN EXCEL (CSV descargable)
// ─────────────────────────────────────────────
function exportToExcel(results: SimResults, currency: "PEN" | "USD", entityName: string, clientName: string, propertyName: string) {
  const cur = currency;
  const sym = cur === "USD" ? "$" : "S/";
  const rows = results.schedule;

  const headers = ["N°","Tipo","Cuota Base","Interés","Amortización","Desgravamen","Seg. Inmueble","Portes","Cuota Total","Saldo Deudor"];
  const dataRows = rows.map(r => [
    r.period,
    r.isGrace ? "GRACIA" : "NORMAL",
    n2(r.basePayment),
    n2(r.interest),
    n2(r.amort),
    n2(r.desgravamen),
    n2(r.propertyInsurance),
    n2(r.monthlyFees),
    n2(r.totalPayment),
    n2(r.balance),
  ]);

  const meta = [
    ["SIMULACIÓN HOGARFIN - CRÉDITO MIVIVIENDA"],
    [],
    ["Cliente:", clientName],
    ["Inmueble:", propertyName],
    ["Entidad:", entityName],
    ["Moneda:", currency],
    ["Principal:", `${sym} ${n2(results.principal)}`],
    ["TEM:", fmtPct(results.tem)],
    ["TCEA:", results.tcea > 0 ? fmtPctShort(results.tcea) : "N/D"],
    ["VAN:", `${sym} ${n2(results.van)}`],
    ["TIR anual:", results.tir > 0 ? fmtPctShort(results.tir) : "N/D"],
    ["Cuota base mensual:", `${sym} ${n2(results.monthlyPayment)}`],
    [],
    headers,
    ...dataRows,
  ];

  const csv = meta.map(row => row.join(";")).join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HogarFin_Simulacion_${clientName.replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// EXPORTACIÓN PDF (HTML imprimible)
// ─────────────────────────────────────────────
function exportToPDF(results: SimResults, currency: "PEN" | "USD", entityName: string, clientName: string, propertyName: string, termYears: number, rateType: string, annualRate: string, cok: string) {
  const cur = currency;
  const sym = cur === "USD" ? "$" : "S/";
  const rows = results.schedule;

  const tableRows = rows.map(r => `
    <tr class="${r.isGrace ? 'grace' : ''}">
      <td>${r.period}${r.isGrace ? ' <span class="badge">G</span>' : ''}</td>
      <td>${sym} ${n2(r.basePayment)}</td>
      <td>${sym} ${n2(r.interest)}</td>
      <td>${sym} ${n2(r.amort)}</td>
      <td>${sym} ${n2(r.desgravamen)}</td>
      <td>${sym} ${n2(r.propertyInsurance)}</td>
      <td><strong>${sym} ${n2(r.totalPayment)}</strong></td>
      <td>${sym} ${n2(r.balance)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Simulación HogarFin</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
  h1 { font-size: 18px; color: #16a34a; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
  .meta { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 20px; }
  .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; }
  .meta-item .label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
  .meta-item .value { font-weight: 700; font-size: 13px; }
  .kpis { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 20px; }
  .kpi { border-radius: 8px; padding: 10px; text-align: center; }
  .kpi.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .kpi.blue { background: #f0f9ff; border: 1px solid #bae6fd; }
  .kpi.purple { background: #faf5ff; border: 1px solid #e9d5ff; }
  .kpi.orange { background: #fffbeb; border: 1px solid #fde68a; }
  .kpi .kpi-label { font-size: 9px; color: #64748b; margin-bottom: 4px; }
  .kpi .kpi-value { font-size: 14px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
  tr.grace td { background: #fffbeb; }
  .badge { background: #fde68a; color: #92400e; border-radius: 4px; padding: 1px 4px; font-size: 9px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>🏠 HogarFin — Simulación Crédito MiVivienda</h1>
<div class="subtitle">Generado el ${new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"long", year:"numeric" })}</div>

<div class="meta">
  <div class="meta-item"><div class="label">Cliente</div><div class="value">${clientName}</div></div>
  <div class="meta-item"><div class="label">Inmueble</div><div class="value">${propertyName}</div></div>
  <div class="meta-item"><div class="label">Entidad Financiera</div><div class="value">${entityName}</div></div>
  <div class="meta-item"><div class="label">Moneda</div><div class="value">${currency}</div></div>
  <div class="meta-item"><div class="label">Tipo de tasa</div><div class="value">${rateType} ${annualRate}%</div></div>
  <div class="meta-item"><div class="label">Plazo</div><div class="value">${termYears} años (${termYears * 12} meses)</div></div>
  <div class="meta-item"><div class="label">Principal</div><div class="value">${sym} ${n2(results.principal)}</div></div>
  <div class="meta-item"><div class="label">COK anual</div><div class="value">${cok}%</div></div>
  ${results.exchangeRateUsed !== 1 ? `<div class="meta-item"><div class="label">Tipo de cambio usado</div><div class="value">${n2(results.exchangeRateUsed)} PEN/USD</div></div>` : "<div></div>"}
</div>

<div class="kpis">
  <div class="kpi green"><div class="kpi-label">Cuota mensual base</div><div class="kpi-value">${sym} ${n2(results.monthlyPayment)}</div></div>
  <div class="kpi blue"><div class="kpi-label">TEM</div><div class="kpi-value">${fmtPct(results.tem)}</div></div>
  <div class="kpi purple"><div class="kpi-label">TCEA</div><div class="kpi-value">${results.tcea > 0 ? fmtPctShort(results.tcea) : "N/D"}</div></div>
  <div class="kpi ${results.van >= 0 ? "green" : "orange"}"><div class="kpi-label">VAN</div><div class="kpi-value">${sym} ${n2(results.van)}</div></div>
  <div class="kpi orange"><div class="kpi-label">TIR anual</div><div class="kpi-value">${results.tir > 0 ? fmtPctShort(results.tir) : "N/D"}</div></div>
</div>

<table>
  <thead>
    <tr>
      <th>N°</th><th>Cuota Base</th><th>Interés</th><th>Amortización</th>
      <th>Desgravamen</th><th>Seg. Inmueble</th><th>Cuota Total</th><th>Saldo Deudor</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>
<div style="margin-top:16px;font-size:9px;color:#94a3b8;">G = Período de gracia | Generado por HogarFin</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function SimulatePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  const [selectedClient, setSelectedClient] = useState<number | "">("");
  const [selectedProperty, setSelectedProperty] = useState<number | "">("");
  const [selectedEntity, setSelectedEntity] = useState<number | "">("");

  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
  const [termYears, setTermYears] = useState(20);
  const [rateType, setRateType] = useState<"TEA" | "TNA">("TEA");
  const [annualRate, setAnnualRate] = useState("12");
  const [capPerYear, setCapPerYear] = useState(12);
  const [desgravamen, setDesgravamen] = useState("0.035");
  const [propInsurance, setPropInsurance] = useState("0.030");
  const [graceTotalMonths, setGraceTotalMonths] = useState(0);

  const [costoNotarial, setCostoNotarial] = useState("0");
  const [costoRegistral, setCostoRegistral] = useState("0");
  const [tasacion, setTasacion] = useState("0");
  const [portesMensual, setPortesMensual] = useState("0");

  const [cok, setCok] = useState("12");
  const [gracePartialMonths, setGracePartialMonths] = useState(0);
  const [applyBono, setApplyBono] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("0");

  const [results, setResults] = useState<SimResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Ref para el scroll independiente del panel de resultados
  const resultsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);
    if (!uid) return;
    const [{ data: cls }, { data: props }, { data: ents }] = await Promise.all([
      supabase.from("clients").select("id,names,last_names,dni").eq("user_id", uid).order("names"),
      supabase.from("properties").select("id,name,price,currency,initial_payment,location").eq("user_id", uid).order("name"),
      supabase.from("financial_entities").select("id,name").order("name"),
    ]);
    if (cls) setClients(cls);
    if (props) setProperties(props);
    if (ents) setEntities(ents);
  }

  const selectedPropertyData = properties.find((p) => p.id === selectedProperty);
  const selectedEntityData = entities.find((e) => e.id === selectedEntity);
  const selectedClientData = clients.find((c) => c.id === selectedClient);

  async function runSimulation() {
    setError(null);
    setSaved(false);
    setResults(null);

    if (!selectedClient) return setError("Selecciona un cliente.");
    if (!selectedProperty) return setError("Selecciona una propiedad.");
    if (!selectedEntity) return setError("Selecciona una entidad financiera.");

    const prop = properties.find((p) => p.id === selectedProperty)!;
    const rate = parseFloat(annualRate) / 100;
    if (isNaN(rate) || rate <= 0) return setError("La tasa de interés debe ser mayor a 0.");
    const cokAnnual = parseFloat(cok) / 100;
    if (isNaN(cokAnnual) || cokAnnual <= 0) return setError("El COK debe ser mayor a 0.");

    setLoading(true);

    // ── CONVERSIÓN USD → PEN ──
    let exchangeRateUsed = 1;
    let priceForCalc = prop.price;
    let initialForCalc = prop.initial_payment;

    if (prop.currency === "USD") {
      // Buscar tipo de cambio en BD
      const { data: fx } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("currency_from", "USD")
        .eq("currency_to", "PEN")
        .eq("is_active", true)
        .single();

      if (!fx) {
        // Fallback: tipo de cambio fijo si no hay en BD
        exchangeRateUsed = 3.75;
      } else {
        exchangeRateUsed = fx.rate;
      }
      priceForCalc = prop.price * exchangeRateUsed;
      initialForCalc = prop.initial_payment * exchangeRateUsed;
    }

    const bonus = applyBono ? (parseFloat(bonusAmount) || 0) : 0;
    const bonusPEN = prop.currency === "USD" ? bonus * exchangeRateUsed : bonus;
    const principal = priceForCalc - initialForCalc - bonusPEN;

    if (principal <= 0) {
      setLoading(false);
      return setError("El monto a financiar debe ser mayor a 0.");
    }

    const totalMonths = termYears * 12;
    const graceTotal = graceTotalMonths;
    const gracePartial = gracePartialMonths;
    if (graceTotal + gracePartial >= totalMonths) {
      setLoading(false);
      return setError("Los meses de gracia no pueden superar el plazo total.");
    }

    const tem = calcTEM(rateType, rate, capPerYear);
    const desRate = parseFloat(desgravamen) / 100;
    const propInsRate = parseFloat(propInsurance) / 100;
    const portesM = parseFloat(portesMensual) || 0;
    const costoInicial = (parseFloat(costoNotarial) || 0) + (parseFloat(costoRegistral) || 0) + (parseFloat(tasacion) || 0);

    const schedule = generateSchedule(
      principal, tem, totalMonths,
      graceTotal, gracePartial,
      desRate, propInsRate, priceForCalc, portesM
    );

    const cashflows = schedule.map((r) => r.totalPayment);
    const principalConCostos = principal + costoInicial;
    const tcea = (() => {
      const tirM = calcTIR(principalConCostos, cashflows);
      return tirM > 0 ? Math.pow(1 + tirM, 12) - 1 : -1;
    })();
    const cokMonthly = Math.pow(1 + cokAnnual, 1 / 12) - 1;
    const van = calcVAN(principalConCostos, cashflows, cokMonthly);
    const tirMensual = calcTIR(principalConCostos, cashflows);
    const tirAnual = tirMensual > 0 ? Math.pow(1 + tirMensual, 12) - 1 : -1;
    const monthlyPayment = schedule.find((r) => !r.isGrace)?.basePayment ?? 0;

    const simResults: SimResults = {
      monthlyPayment, tem, tcea, van, tir: tirAnual,
      schedule, principal, annualRate: rate, rateType: rateType,
      currency: prop.currency,
      exchangeRateUsed,
      principalPEN: principal,
    };

    setResults(simResults);
    setLoading(false);

    // Scroll al panel de resultados (solo el contenedor interno)
    setTimeout(() => {
      resultsScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    // ── GUARDAR EN BD ──
    try {
      const { data: ratePlan } = await supabase
        .from("rate_plans")
        .select("id")
        .eq("entity_id", selectedEntity)
        .eq("currency", "PEN") // siempre PEN en BD
        .eq("rate_type", rateType)
        .limit(1)
        .single();

      const ratePlanId = ratePlan?.id ?? null;
      if (!ratePlanId) {
        setError("⚠️ Simulación calculada. No se pudo guardar: configura un rate_plan para este banco.");
        return;
      }

      const { data: sim } = await supabase
        .from("loan_simulations")
        .insert({
          user_id: userId,
          client_id: selectedClient,
          property_id: selectedProperty,
          entity_id: selectedEntity,
          rate_plan_id: ratePlanId,
          currency: "PEN", // siempre guardamos en PEN
          property_value: priceForCalc,
          initial_payment: initialForCalc,
          bonus_amount: bonusPEN,
          principal,
          term_months: totalMonths,
          annual_rate_used: rate,
          rate_type_used: rateType,
          capitalization_per_year_used: capPerYear,
          monthly_rate: tem,
          monthly_payment: monthlyPayment,
          grace_type: graceTotal > 0 ? "TOTAL" : gracePartial > 0 ? "PARTIAL" : "NONE",
          grace_months: graceTotal > 0 ? graceTotal : gracePartial,
          tcea: tcea > 0 ? tcea : null,
          van,
          tir: tirAnual > 0 ? tirAnual : null,
          desgravamen_monthly_rate_used: desRate,
          property_insurance_annual_rate_used: propInsRate,
          monthly_fees_fixed_used: portesM,
          upfront_costs_fixed_used: costoInicial,
          cok_monthly_used: cokMonthly,
          exchange_rate_used: exchangeRateUsed,
        })
        .select()
        .single();

      if (sim) {
        await supabase.from("schedule_rows").insert(
          schedule.map((r) => ({
            simulation_id: sim.id,
            n: r.period,
            payment: r.basePayment,
            interest: r.interest,
            amortization: r.amort,
            balance: r.balance,
            base_payment: r.basePayment,
            desgravamen: r.desgravamen,
            property_insurance: r.propertyInsurance,
            monthly_fees: r.monthlyFees,
            total_payment: r.totalPayment,
            cashflow: r.cashflow,
            is_grace_period: r.isGrace,
          }))
        );
        setSaved(true);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const displayCur = results?.currency ?? (selectedPropertyData?.currency ?? "PEN");

  return (
    // Contenedor principal con altura fija y scroll solo interno
    <div className="flex h-[calc(100vh-120px)] flex-col gap-0 overflow-hidden">

      {/* Panel de formulario (izquierda / arriba) con scroll propio */}
      <div className="flex flex-1 gap-6 overflow-hidden">

        {/* FORMULARIO — scroll independiente */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 pb-6">

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Nueva Simulación</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configura los parámetros del crédito MiVivienda y obtén el cronograma, VAN y TIR.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* SECCIÓN 1: Cliente e Inmueble */}
          <Section icon={<User className="h-4 w-4" />} title="Cliente e Inmueble">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Cliente">
                <select value={selectedClient} onChange={(e) => setSelectedClient(Number(e.target.value) || "")} className={selectCls}>
                  <option value="">— Selecciona un cliente —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.names} {c.last_names} · DNI {c.dni}</option>
                  ))}
                </select>
              </Field>
              <Field label="Inmueble">
                <select value={selectedProperty} onChange={(e) => setSelectedProperty(Number(e.target.value) || "")} className={selectCls}>
                  <option value="">— Selecciona un inmueble —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.currency === "USD" ? "$" : "S/"} {p.price.toLocaleString("es-PE")}</option>
                  ))}
                </select>
              </Field>
            </div>
            {selectedPropertyData && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoChip label="Precio" value={fmt(selectedPropertyData.price, selectedPropertyData.currency)} />
                <InfoChip label="Cuota inicial" value={fmt(selectedPropertyData.initial_payment, selectedPropertyData.currency)} />
                <InfoChip label="Moneda" value={selectedPropertyData.currency} />
                <InfoChip label="Ubicación" value={selectedPropertyData.location} />
              </div>
            )}
          </Section>

          {/* SECCIÓN 2: Parámetros Financieros */}
          <Section icon={<TrendingUp className="h-4 w-4" />} title="Parámetros Financieros">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Entidad Financiera">
                <select value={selectedEntity} onChange={(e) => setSelectedEntity(Number(e.target.value) || "")} className={selectCls}>
                  <option value="">— Selecciona banco —</option>
                  {entities.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                </select>
              </Field>
              <Field label="Moneda del inmueble">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")} className={selectCls}>
                  <option value="PEN">PEN (Soles)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
                {currency === "USD" && (
                  <p className="mt-1 text-xs text-amber-600">⚠️ Los cálculos se convertirán a PEN automáticamente.</p>
                )}
              </Field>
              <Field label="Plazo (años)">
                <div className="flex items-center gap-2">
                  <input type="number" min={5} max={25} value={termYears}
                    onChange={(e) => setTermYears(Math.min(25, Math.max(5, Number(e.target.value))))}
                    className={inputCls} />
                  <span className="text-xs text-slate-500 shrink-0">{termYears * 12} meses</span>
                </div>
              </Field>
              <Field label="Tipo de Tasa">
                <select value={rateType} onChange={(e) => setRateType(e.target.value as "TEA" | "TNA")} className={selectCls}>
                  <option value="TEA">Efectiva Anual (TEA)</option>
                  <option value="TNA">Nominal Anual (TNA)</option>
                </select>
              </Field>
              <Field label={`Interés ${rateType} (%)`}>
                <input type="number" step="0.01" min="0.01" max="99" value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)} className={inputCls} placeholder="Ej: 12.00" />
              </Field>
              {rateType === "TNA" && (
                <Field label="Capitalización (veces/año)">
                  <select value={capPerYear} onChange={(e) => setCapPerYear(Number(e.target.value))} className={selectCls}>
                    <option value={1}>Anual (1)</option>
                    <option value={2}>Semestral (2)</option>
                    <option value={4}>Trimestral (4)</option>
                    <option value={6}>Bimestral (6)</option>
                    <option value={12}>Mensual (12)</option>
                    <option value={24}>Quincenal (24)</option>
                    <option value={360}>Diaria (360)</option>
                  </select>
                </Field>
              )}
              <Field label="Seg. Desgravamen mensual (%)">
                <input type="number" step="0.001" min="0" value={desgravamen}
                  onChange={(e) => setDesgravamen(e.target.value)} className={inputCls} placeholder="Ej: 0.035" />
              </Field>
              <Field label="Seg. Inmueble anual (%)">
                <input type="number" step="0.001" min="0" value={propInsurance}
                  onChange={(e) => setPropInsurance(e.target.value)} className={inputCls} placeholder="Ej: 0.030" />
              </Field>
              <Field label="Gracia Total (meses)">
                <input type="number" min={0} max={termYears * 12 - 1} value={graceTotalMonths}
                  onChange={(e) => setGraceTotalMonths(Math.max(0, Number(e.target.value)))} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* SECCIÓN 3: Costos */}
          <Section icon={<DollarSign className="h-4 w-4" />} title="Costos y Gastos Adicionales">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Field label="Costos Notariales (S/)">
                <input type="number" min="0" value={costoNotarial} onChange={(e) => setCostoNotarial(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
              <Field label="Costos Registrales (S/)">
                <input type="number" min="0" value={costoRegistral} onChange={(e) => setCostoRegistral(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
              <Field label="Tasación (S/)">
                <input type="number" min="0" value={tasacion} onChange={(e) => setTasacion(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
              <Field label="Portes Mensual (S/)">
                <input type="number" min="0" value={portesMensual} onChange={(e) => setPortesMensual(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
            </div>
          </Section>

          {/* SECCIÓN 4: Evaluación */}
          <Section icon={<BarChart3 className="h-4 w-4" />} title="Parámetros de Evaluación">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Tasa de Descuento COK anual (%)">
                <input type="number" step="0.01" min="0.01" value={cok}
                  onChange={(e) => setCok(e.target.value)} className={inputCls} placeholder="Ej: 12" />
              </Field>
              <Field label="Gracia Parcial (meses)">
                <input type="number" min={0} max={termYears * 12 - 1} value={gracePartialMonths}
                  onChange={(e) => setGracePartialMonths(Math.max(0, Number(e.target.value)))} className={inputCls} />
              </Field>
              <Field label="¿Aplica Bono Techo Propio / BBP?">
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="bono" checked={!applyBono} onChange={() => setApplyBono(false)} className="accent-green-600" />
                    <span className="text-sm text-slate-700">No aplica</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="bono" checked={applyBono} onChange={() => setApplyBono(true)} className="accent-green-600" />
                    <span className="text-sm text-slate-700">Sí aplica</span>
                  </label>
                </div>
              </Field>
              {applyBono && (
                <Field label="Monto del Bono (S/)">
                  <input type="number" min="0" value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)} className={inputCls} placeholder="Ej: 20000" />
                </Field>
              )}
            </div>
          </Section>

          <div className="flex justify-end pb-2">
            <button onClick={runSimulation} disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50">
              <Calculator className="h-4 w-4" />
              {loading ? "Calculando..." : "Calcular Simulación"}
            </button>
          </div>
        </div>

        {/* RESULTADOS — panel lateral con scroll propio */}
        {results && (
          <div
            ref={resultsScrollRef}
            className="w-full lg:w-[480px] xl:w-[540px] shrink-0 overflow-y-auto space-y-4 pl-1 pb-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Resultados</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToExcel(
                    results,
                    displayCur as "PEN" | "USD",
                    selectedEntityData?.name ?? "Banco",
                    selectedClientData ? `${selectedClientData.names} ${selectedClientData.last_names}` : "Cliente",
                    selectedPropertyData?.name ?? "Inmueble"
                  )}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                  Excel
                </button>
                <button
                  onClick={() => exportToPDF(
                    results,
                    displayCur as "PEN" | "USD",
                    selectedEntityData?.name ?? "Banco",
                    selectedClientData ? `${selectedClientData.names} ${selectedClientData.last_names}` : "Cliente",
                    selectedPropertyData?.name ?? "Inmueble",
                    termYears, rateType, annualRate, cok
                  )}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-rose-500" />
                  PDF
                </button>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Simulación guardada en la base de datos.
              </div>
            )}

            {results.exchangeRateUsed !== 1 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                💱 Tipo de cambio usado: <strong>1 USD = {n2(results.exchangeRateUsed)} PEN</strong>. Todos los valores se muestran en PEN.
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Cuota mensual base" value={fmt(results.monthlyPayment, "PEN")} sub="Sin seguros ni portes" color="green" />
              <KPICard label="TEM" value={fmtPct(results.tem)} sub="Tasa Efectiva Mensual" color="blue" />
              <KPICard label="TCEA" value={results.tcea > 0 ? fmtPctShort(results.tcea) : "N/D"} sub="Costo Efectivo Anual" color="purple" />
              <KPICard label="VAN" value={fmt(results.van, "PEN")} sub={`COK ${cok}% anual`} color={results.van >= 0 ? "green" : "red"} />
              <KPICard label="TIR anual" value={results.tir > 0 ? fmtPctShort(results.tir) : "N/D"} sub="Tasa Interna de Retorno" color="orange" />
              <KPICard label="Principal (PEN)" value={fmt(results.principalPEN, "PEN")} sub="Monto a financiar" color="blue" />
            </div>

            {/* Detalle */}
            <div className="grid grid-cols-2 gap-2">
              <InfoChip label={`${results.rateType} ingresada`} value={fmtPctShort(results.annualRate)} />
              <InfoChip label="Plazo" value={`${termYears} años · ${termYears * 12} m`} />
              <InfoChip label="Cuota total (con seguros)" value={fmt(results.schedule.find(r => !r.isGrace)?.totalPayment ?? 0, "PEN")} />
              <InfoChip label="Periodos de gracia" value={`Total: ${graceTotalMonths}m / Parcial: ${gracePartialMonths}m`} />
            </div>

            {/* Cronograma */}
            <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-700" />
                  <span className="font-semibold text-slate-800 text-sm">Cronograma de Pagos</span>
                </div>
                <button onClick={() => setShowSchedule(v => !v)}
                  className="text-xs font-medium text-green-700 hover:underline">
                  {showSchedule ? "Ver menos" : "Ver completo"}
                </button>
              </div>
              <div className="px-4 py-3">
                <ScheduleTable rows={results.schedule.slice(0, showSchedule ? undefined : 6)} />
                {!showSchedule && results.schedule.length > 6 && (
                  <div className="mt-2 text-center text-xs text-slate-400">
                    ... y {results.schedule.length - 6} periodos más
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-700">{icon}</span>
        <span className="font-semibold text-slate-800 text-sm">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{value}</div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  orange: "bg-amber-50 text-amber-700 ring-amber-200",
};

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`rounded-xl p-3.5 ring-1 ${colorMap[color] ?? colorMap.green}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-base font-bold leading-tight">{value}</div>
      <div className="mt-0.5 text-xs opacity-70">{sub}</div>
    </div>
  );
}

function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            {["N°", "Base", "Interés", "Amort.", "Desg.", "Seg.", "Total", "Saldo"].map(h => (
              <th key={h} className="whitespace-nowrap px-2.5 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.period} className={`border-t border-slate-100 ${r.isGrace ? "bg-amber-50/60" : "hover:bg-slate-50"}`}>
              <td className="px-2.5 py-1.5 font-medium text-slate-700">
                {r.period}{r.isGrace && <span className="ml-1 rounded bg-amber-200 px-1 text-[9px] text-amber-800">G</span>}
              </td>
              <td className="px-2.5 py-1.5">{n2(r.basePayment)}</td>
              <td className="px-2.5 py-1.5">{n2(r.interest)}</td>
              <td className="px-2.5 py-1.5">{n2(r.amort)}</td>
              <td className="px-2.5 py-1.5">{n2(r.desgravamen)}</td>
              <td className="px-2.5 py-1.5">{n2(r.propertyInsurance)}</td>
              <td className="px-2.5 py-1.5 font-semibold text-slate-900">{n2(r.totalPayment)}</td>
              <td className="px-2.5 py-1.5 text-slate-600">{n2(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const selectCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";