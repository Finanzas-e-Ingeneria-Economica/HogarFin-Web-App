"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Calculator, User, TrendingUp, DollarSign, BarChart3,
  Clock, CheckCircle2, AlertCircle, FileSpreadsheet, Download, Zap,
} from "lucide-react";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type Client   = { id: number; names: string; last_names: string; dni: string };
type Property = { id: number; name: string; price: number; currency: "PEN"|"USD"; initial_payment: number; location: string };
type Entity   = { id: number; name: string };

type BankData = {
  rateType: "TEA" | "TNA";
  annualRate: number;           // decimal, e.g. 0.12
  capPerYear: number;
  desgravamen: number;          // mensual %, e.g. 0.035
  propInsurance: number;        // anual %, e.g. 0.030
  portesMensual: number;        // S/
};

type ScheduleRow = {
  period: number; balance: number; interest: number; amort: number;
  basePayment: number; desgravamen: number; propertyInsurance: number;
  monthlyFees: number; totalPayment: number; cashflow: number; isGrace: boolean;
};

type SimResults = {
  monthlyPayment: number; tem: number; tcea: number; van: number; tir: number;
  schedule: ScheduleRow[]; principal: number; annualRate: number; rateType: string;
  currency: "PEN"|"USD"; exchangeRateUsed: number; principalPEN: number;
};

// ─────────────────────────────────────────────
// HELPERS FINANCIEROS (fórmulas del informe)
// ─────────────────────────────────────────────
function calcTEM(rateType: "TEA"|"TNA", annualRate: number, cap: number): number {
  if (rateType === "TEA") return Math.pow(1 + annualRate, 1/12) - 1;
  const tea = Math.pow(1 + annualRate / cap, cap) - 1;
  return Math.pow(1 + tea, 1/12) - 1;
}

function calcCuota(p: number, i: number, n: number): number {
  if (n <= 0) return 0;
  if (i === 0) return p / n;
  return (p * i) / (1 - Math.pow(1+i, -n));
}

function calcVAN(principal: number, cfs: number[], cokM: number): number {
  return -principal + cfs.reduce((s, cf, t) => s + cf / Math.pow(1+cokM, t+1), 0);
}

function calcTIR(principal: number, cfs: number[]): number {
  const f = (r: number) => -principal + cfs.reduce((s,cf,t) => s + cf/Math.pow(1+r,t+1), 0);
  let a = 1e-6, b = 1;
  if (f(a)*f(b) > 0) return -1;
  for (let i = 0; i < 200; i++) {
    const m = (a+b)/2;
    if (Math.abs(f(m)) < 1e-7) return m;
    f(a)*f(m) < 0 ? (b=m) : (a=m);
  }
  return (a+b)/2;
}

function generateSchedule(
  principal: number, tem: number, totalMonths: number,
  graceTotal: number, gracePartial: number,
  desRate: number, propInsAnnual: number, propValue: number, fees: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let bal = principal;

  // Gracia total: capitaliza intereses
  for (let i = 1; i <= graceTotal; i++) {
    const interest = bal * tem;
    bal += interest;
    const des = bal * desRate;
    const ins = (propValue * propInsAnnual) / 12;
    const total = des + ins + fees;
    rows.push({ period:i, balance:bal, interest, amort:0, basePayment:0, desgravamen:des, propertyInsurance:ins, monthlyFees:fees, totalPayment:total, cashflow:-total, isGrace:true });
  }

  // Gracia parcial: paga solo intereses
  for (let i = graceTotal+1; i <= graceTotal+gracePartial; i++) {
    const interest = bal * tem;
    const des = bal * desRate;
    const ins = (propValue * propInsAnnual) / 12;
    const total = interest + des + ins + fees;
    rows.push({ period:i, balance:bal, interest, amort:0, basePayment:interest, desgravamen:des, propertyInsurance:ins, monthlyFees:fees, totalPayment:total, cashflow:-total, isGrace:true });
  }

  // Cuotas normales con saldo post-gracia
  const n = Math.max(1, totalMonths - graceTotal - gracePartial);
  const cuota = calcCuota(bal, tem, n);
  for (let i = graceTotal+gracePartial+1; i <= totalMonths; i++) {
    const interest = bal * tem;
    let amort = cuota - interest;
    if (amort < 0) amort = 0;
    bal = Math.max(0, bal - amort);
    const des = bal * desRate;
    const ins = (propValue * propInsAnnual) / 12;
    const total = cuota + des + ins + fees;
    rows.push({ period:i, balance:bal, interest, amort, basePayment:cuota, desgravamen:des, propertyInsurance:ins, monthlyFees:fees, totalPayment:total, cashflow:-total, isGrace:false });
  }
  return rows;
}

// ─────────────────────────────────────────────
// FORMATEADORES
// ─────────────────────────────────────────────
const fmt    = (v:number, c:"PEN"|"USD"="PEN") => `${c==="USD"?"$ ":"S/ "}${new Intl.NumberFormat("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}`;
const fmtP   = (v:number) => `${(v*100).toFixed(4)}%`;
const fmtPs  = (v:number) => `${(v*100).toFixed(2)}%`;
const n2     = (v:number) => v.toFixed(2);

// ─────────────────────────────────────────────
// EXPORTAR EXCEL (CSV)
// ─────────────────────────────────────────────
function exportExcel(r: SimResults, cur:"PEN"|"USD", bank:string, client:string, prop:string) {
  const sym = cur==="USD"?"$":"S/";
  const meta = [
    ["SIMULACIÓN HOGARFIN – CRÉDITO MIVIVIENDA"],[], 
    ["Cliente:",client],["Inmueble:",prop],["Entidad:",bank],["Moneda:","PEN (calculado)"],
    ["Principal:",`${sym} ${n2(r.principal)}`],["TEM:",fmtP(r.tem)],
    ["TCEA:",r.tcea>0?fmtPs(r.tcea):"N/D"],["VAN:",`${sym} ${n2(r.van)}`],
    ["TIR anual:",r.tir>0?fmtPs(r.tir):"N/D"],["Cuota base:",`${sym} ${n2(r.monthlyPayment)}`],[],
    ["N°","Tipo","Cuota Base","Interés","Amortización","Desgravamen","Seg.Inmueble","Portes","Cuota Total","Saldo"],
    ...r.schedule.map(s=>[s.period,s.isGrace?"GRACIA":"NORMAL",n2(s.basePayment),n2(s.interest),n2(s.amort),n2(s.desgravamen),n2(s.propertyInsurance),n2(s.monthlyFees),n2(s.totalPayment),n2(s.balance)]),
  ];
  const csv = meta.map(row=>row.join(";")).join("\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `HogarFin_${client.replace(/\s/g,"_")}.csv`;
  a.click();
}

// ─────────────────────────────────────────────
// EXPORTAR PDF
// ─────────────────────────────────────────────
function exportPDF(r:SimResults, cur:"PEN"|"USD", bank:string, client:string, prop:string, termYears:number, rateType:string, annualRate:string, cok:string) {
  const sym = "S/";
  const rows = r.schedule.map(s=>`<tr class="${s.isGrace?"grace":""}"><td>${s.period}${s.isGrace?' <span class="badge">G</span>':''}</td><td>${sym} ${n2(s.basePayment)}</td><td>${sym} ${n2(s.interest)}</td><td>${sym} ${n2(s.amort)}</td><td>${sym} ${n2(s.desgravamen)}</td><td>${sym} ${n2(s.propertyInsurance)}</td><td><strong>${sym} ${n2(s.totalPayment)}</strong></td><td>${sym} ${n2(s.balance)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Simulación HogarFin</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:24px}
h1{font-size:18px;color:#16a34a;margin-bottom:4px}.sub{font-size:12px;color:#64748b;margin-bottom:20px}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}
.mi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px}
.mi .l{font-size:10px;color:#94a3b8;margin-bottom:2px}.mi .v{font-weight:700;font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px}
.kpi{border-radius:8px;padding:10px;text-align:center}
.green{background:#f0fdf4;border:1px solid #bbf7d0}.blue{background:#f0f9ff;border:1px solid #bae6fd}
.purple{background:#faf5ff;border:1px solid #e9d5ff}.orange{background:#fffbeb;border:1px solid #fde68a}
.kpi .kl{font-size:9px;color:#64748b;margin-bottom:4px}.kpi .kv{font-size:14px;font-weight:800}
table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;color:#475569;border-bottom:2px solid #e2e8f0}
td{padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:10px}tr.grace td{background:#fffbeb}
.badge{background:#fde68a;color:#92400e;border-radius:4px;padding:1px 4px;font-size:9px}
@media print{body{padding:0}}</style></head><body>
<h1>🏠 HogarFin — Simulación Crédito MiVivienda</h1>
<div class="sub">Generado el ${new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"})}</div>
<div class="meta">
  <div class="mi"><div class="l">Cliente</div><div class="v">${client}</div></div>
  <div class="mi"><div class="l">Inmueble</div><div class="v">${prop}</div></div>
  <div class="mi"><div class="l">Entidad</div><div class="v">${bank}</div></div>
  <div class="mi"><div class="l">Moneda guardada</div><div class="v">PEN</div></div>
  <div class="mi"><div class="l">Tipo tasa</div><div class="v">${rateType} ${annualRate}%</div></div>
  <div class="mi"><div class="l">Plazo</div><div class="v">${termYears} años · ${termYears*12} meses</div></div>
  <div class="mi"><div class="l">Principal</div><div class="v">${sym} ${n2(r.principal)}</div></div>
  <div class="mi"><div class="l">COK anual</div><div class="v">${cok}%</div></div>
  ${r.exchangeRateUsed!==1?`<div class="mi"><div class="l">T.C. usado</div><div class="v">${n2(r.exchangeRateUsed)} PEN/USD</div></div>`:"<div></div>"}
</div>
<div class="kpis">
  <div class="kpi green"><div class="kl">Cuota mensual base</div><div class="kv">${sym} ${n2(r.monthlyPayment)}</div></div>
  <div class="kpi blue"><div class="kl">TEM</div><div class="kv">${fmtP(r.tem)}</div></div>
  <div class="kpi purple"><div class="kl">TCEA</div><div class="kv">${r.tcea>0?fmtPs(r.tcea):"N/D"}</div></div>
  <div class="kpi ${r.van>=0?"green":"orange"}"><div class="kl">VAN</div><div class="kv">${sym} ${n2(r.van)}</div></div>
  <div class="kpi orange"><div class="kl">TIR anual</div><div class="kv">${r.tir>0?fmtPs(r.tir):"N/D"}</div></div>
</div>
<table><thead><tr><th>N°</th><th>Cuota Base</th><th>Interés</th><th>Amortización</th><th>Desgravamen</th><th>Seg.Inmueble</th><th>Cuota Total</th><th>Saldo</th></tr></thead>
<tbody>${rows}</tbody></table>
<div style="margin-top:16px;font-size:9px;color:#94a3b8">G = Período de gracia | HogarFin</div>
</body></html>`;
  const w = window.open("","_blank");
  if(!w) return;
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(()=>w.print(),500);
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function SimulatePage() {
  const [userId, setUserId]       = useState<string|null>(null);
  const [clients, setClients]     = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [entities, setEntities]   = useState<Entity[]>([]);

  const [selectedClient,   setSelectedClient]   = useState<number|"">("");
  const [selectedProperty, setSelectedProperty] = useState<number|"">("");
  const [selectedEntity,   setSelectedEntity]   = useState<number|"">("");

  // ── Parámetros financieros (autorellenan desde BD) ──
  const [currency,       setCurrency]       = useState<"PEN"|"USD">("PEN");
  const [termYears,      setTermYears]      = useState(20);
  const [rateType,       setRateType]       = useState<"TEA"|"TNA">("TEA");
  const [annualRate,     setAnnualRate]     = useState("");
  const [capPerYear,     setCapPerYear]     = useState(12);
  const [desgravamen,    setDesgravamen]    = useState("");
  const [propInsurance,  setPropInsurance]  = useState("");
  const [portesMensual,  setPortesMensual]  = useState("0");
  const [bankLoading,    setBankLoading]    = useState(false);
  const [bankLoaded,     setBankLoaded]     = useState(false);

  // ── Costos y gastos ──
  const [costoNotarial,    setCostoNotarial]    = useState("0");
  const [costoRegistral,   setCostoRegistral]   = useState("0");
  const [tasacion,         setTasacion]         = useState("0");
  const [comisionEstudio,  setComisionEstudio]  = useState("0");
  const [comisionActivacion, setComisionActivacion] = useState("0");
  const [comisionPeriodica,  setComisionPeriodica]  = useState("0");
  const [gastosAdmin,      setGastosAdmin]      = useState("0");

  // ── Evaluación ──
  const [cok,                setCok]                = useState("12");
  const [graceTotalMonths,   setGraceTotalMonths]   = useState(0);
  const [gracePartialMonths, setGracePartialMonths] = useState(0);
  const [applyBono,          setApplyBono]          = useState(false);
  const [bonusAmount,        setBonusAmount]        = useState("0");

  const [results,      setResults]      = useState<SimResults|null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string|null>(null);
  const [saved,        setSaved]        = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

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
    if (cls)  setClients(cls);
    if (props) setProperties(props);
    if (ents)  setEntities(ents);
  }

  // ── Autorelleno al seleccionar banco ──
  async function onEntityChange(entityId: number | "") {
    setSelectedEntity(entityId);
    setBankLoaded(false);

    if (!entityId) {
      setAnnualRate(""); setCapPerYear(12); setDesgravamen(""); setPropInsurance(""); setPortesMensual("0");
      return;
    }

    setBankLoading(true);

    // 1. Traer rate_plan activo para PEN (moneda base)
    const { data: rp } = await supabase
      .from("rate_plans")
      .select("rate_type, annual_rate, capitalization_per_year")
      .eq("entity_id", entityId)
      .eq("currency", "PEN")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Traer bank_conditions activo para PEN
    const { data: bc } = await supabase
      .from("bank_conditions")
      .select("desgravamen_monthly_rate, property_insurance_annual_rate, monthly_fees_fixed")
      .eq("entity_id", entityId)
      .eq("currency", "PEN")
      .eq("is_active", true)
      .maybeSingle();

    if (rp) {
      setRateType(rp.rate_type as "TEA"|"TNA");
      // annual_rate en BD es decimal (0.12), mostramos como porcentaje (12)
      setAnnualRate((Number(rp.annual_rate) * 100).toFixed(4));
      setCapPerYear(rp.capitalization_per_year);
    }

    if (bc) {
      // desgravamen en BD es decimal mensual (0.00035), mostramos como % (0.035)
      setDesgravamen((Number(bc.desgravamen_monthly_rate) * 100).toFixed(4));
      setPropInsurance((Number(bc.property_insurance_annual_rate) * 100).toFixed(4));
      setPortesMensual(Number(bc.monthly_fees_fixed).toFixed(2));
    }

    setBankLoading(false);
    if (rp || bc) setBankLoaded(true);
  }

  async function runSimulation() {
    setError(null); setSaved(false); setResults(null);

    if (!selectedClient)   return setError("Selecciona un cliente.");
    if (!selectedProperty) return setError("Selecciona una propiedad.");
    if (!selectedEntity)   return setError("Selecciona una entidad financiera.");
    if (!annualRate)       return setError("La tasa de interés es obligatoria.");

    const prop  = properties.find(p => p.id === selectedProperty)!;
    const rate  = parseFloat(annualRate) / 100;
    if (isNaN(rate) || rate <= 0) return setError("La tasa debe ser mayor a 0.");
    const cokA  = parseFloat(cok) / 100;
    if (isNaN(cokA) || cokA <= 0) return setError("El COK debe ser mayor a 0.");

    setLoading(true);

    // ── Conversión USD → PEN ──
    let fxRate = 1;
    let pricePEN = prop.price;
    let initPEN  = prop.initial_payment;

    if (prop.currency === "USD") {
      const { data: fx } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("currency_from","USD").eq("currency_to","PEN").eq("is_active",true)
        .maybeSingle();
      fxRate   = fx?.rate ?? 3.75;
      pricePEN = prop.price * fxRate;
      initPEN  = prop.initial_payment * fxRate;
    }

    const bonus      = applyBono ? (parseFloat(bonusAmount)||0) : 0;
    const bonusPEN   = prop.currency==="USD" ? bonus*fxRate : bonus;
    const principal  = pricePEN - initPEN - bonusPEN;

    if (principal <= 0) { setLoading(false); return setError("El monto a financiar debe ser mayor a 0."); }

    const totalMonths = termYears * 12;
    const gT = graceTotalMonths, gP = gracePartialMonths;
    if (gT + gP >= totalMonths) { setLoading(false); return setError("Los meses de gracia no pueden superar el plazo total."); }

    const tem         = calcTEM(rateType, rate, capPerYear);
    const desRate     = parseFloat(desgravamen)   / 100;
    const insRate     = parseFloat(propInsurance) / 100;
    const portesM     = parseFloat(portesMensual) || 0;
    const portesTotal = portesM + (parseFloat(comisionPeriodica)||0) + (parseFloat(gastosAdmin)||0);

    // Costos iniciales (upfront): impactan el TCEA/VAN/TIR pero no la cuota mensual
    const costoInicial =
      (parseFloat(costoNotarial)    ||0) +
      (parseFloat(costoRegistral)   ||0) +
      (parseFloat(tasacion)         ||0) +
      (parseFloat(comisionEstudio)  ||0) +
      (parseFloat(comisionActivacion)||0);

    const schedule = generateSchedule(principal, tem, totalMonths, gT, gP, desRate, insRate, pricePEN, portesTotal);

    const cashflows        = schedule.map(r => r.totalPayment);
    const principalTotal   = principal + costoInicial;
    const tcea             = (() => { const t = calcTIR(principalTotal, cashflows); return t>0 ? Math.pow(1+t,12)-1 : -1; })();
    const cokM             = Math.pow(1+cokA,1/12) - 1;
    const van              = calcVAN(principalTotal, cashflows, cokM);
    const tirM             = calcTIR(principalTotal, cashflows);
    const tir              = tirM>0 ? Math.pow(1+tirM,12)-1 : -1;
    const monthlyPayment   = schedule.find(r=>!r.isGrace)?.basePayment ?? 0;

    const simResults: SimResults = {
      monthlyPayment, tem, tcea, van, tir,
      schedule, principal, annualRate: rate, rateType,
      currency: prop.currency, exchangeRateUsed: fxRate, principalPEN: principal,
    };

    setResults(simResults);
    setLoading(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 150);

    // ── Guardar en BD ──
    try {
      const { data: rp } = await supabase.from("rate_plans").select("id")
        .eq("entity_id", selectedEntity).eq("currency","PEN").eq("rate_type", rateType)
        .limit(1).maybeSingle();

      if (!rp) { setError("⚠️ Calculado. No se pudo guardar: no hay rate_plan configurado."); return; }

      const { data: sim } = await supabase.from("loan_simulations").insert({
        user_id: userId, client_id: selectedClient, property_id: selectedProperty,
        entity_id: selectedEntity, rate_plan_id: rp.id,
        currency: "PEN", property_value: pricePEN, initial_payment: initPEN,
        bonus_amount: bonusPEN, principal,
        term_months: totalMonths, annual_rate_used: rate,
        rate_type_used: rateType, capitalization_per_year_used: capPerYear,
        monthly_rate: tem, monthly_payment: monthlyPayment,
        grace_type: gT>0?"TOTAL":gP>0?"PARTIAL":"NONE",
        grace_months: gT>0?gT:gP,
        tcea: tcea>0?tcea:null, van, tir: tir>0?tir:null,
        desgravamen_monthly_rate_used: desRate,
        property_insurance_annual_rate_used: insRate,
        monthly_fees_fixed_used: portesTotal,
        upfront_costs_fixed_used: costoInicial,
        cok_monthly_used: cokM, exchange_rate_used: fxRate,
      }).select().single();

      if (sim) {
        await supabase.from("schedule_rows").insert(
          schedule.map(r => ({
            simulation_id: sim.id, n: r.period,
            payment: r.basePayment, interest: r.interest, amortization: r.amort,
            balance: r.balance, base_payment: r.basePayment,
            desgravamen: r.desgravamen, property_insurance: r.propertyInsurance,
            monthly_fees: r.monthlyFees, total_payment: r.totalPayment,
            cashflow: r.cashflow, is_grace_period: r.isGrace,
          }))
        );
        setSaved(true);
      }
    } catch(e) { console.error(e); }
  }

  const propData    = properties.find(p => p.id === selectedProperty);
  const entityData  = entities.find(e => e.id === selectedEntity);
  const clientData  = clients.find(c => c.id === selectedClient);

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col overflow-hidden">
      <div className="flex flex-1 gap-6 overflow-hidden">

        {/* ── FORMULARIO (scroll independiente) ── */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 pb-6">

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Nueva Simulación</h1>
            <p className="text-sm text-slate-500 mt-1">Crédito MiVivienda — Método Francés Vencido Ordinario</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* SECCIÓN 1: Cliente e Inmueble */}
          <Section icon={<User className="h-4 w-4"/>} title="Cliente e Inmueble">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Cliente">
                <select value={selectedClient} onChange={e=>setSelectedClient(Number(e.target.value)||"")} className={sel}>
                  <option value="">— Selecciona un cliente —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.names} {c.last_names} · DNI {c.dni}</option>)}
                </select>
              </Field>
              <Field label="Inmueble">
                <select value={selectedProperty} onChange={e=>setSelectedProperty(Number(e.target.value)||"")} className={sel}>
                  <option value="">— Selecciona un inmueble —</option>
                  {properties.map(p=><option key={p.id} value={p.id}>{p.name} · {p.currency==="USD"?"$":"S/"} {p.price.toLocaleString("es-PE")}</option>)}
                </select>
              </Field>
            </div>
            {propData && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Chip label="Precio"        value={fmt(propData.price, propData.currency)}/>
                <Chip label="Cuota inicial" value={fmt(propData.initial_payment, propData.currency)}/>
                <Chip label="Moneda"        value={propData.currency}/>
                <Chip label="Ubicación"     value={propData.location}/>
              </div>
            )}
          </Section>

          {/* SECCIÓN 2: Parámetros Financieros */}
          <Section icon={<TrendingUp className="h-4 w-4"/>} title="Parámetros Financieros">

            {/* Entidad financiera */}
            <div className="mb-4">
              <Field label="Entidad Financiera">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedEntity}
                    onChange={e => onEntityChange(Number(e.target.value)||"")}
                    className={sel + " flex-1"}
                  >
                    <option value="">— Selecciona banco —</option>
                    {entities.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  {bankLoading && <span className="text-xs text-slate-400 shrink-0 animate-pulse">Cargando...</span>}
                  {bankLoaded && !bankLoading && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 shrink-0">
                      <Zap className="h-3 w-3"/> Datos cargados
                    </span>
                  )}
                </div>
              </Field>
            </div>

            {bankLoaded && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0"/>
                Los parámetros de <strong>{entityData?.name}</strong> fueron autocompletados. Puedes editarlos si es necesario.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Moneda del inmueble">
                <select value={currency} onChange={e=>setCurrency(e.target.value as "PEN"|"USD")} className={sel}>
                  <option value="PEN">PEN (Soles)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
                {currency==="USD" && <p className="mt-1 text-xs text-amber-600">⚠️ Se convertirá a PEN automáticamente.</p>}
              </Field>

              <Field label="Plazo (años)">
                <div className="flex items-center gap-2">
                  <input type="number" min={5} max={25} value={termYears}
                    onChange={e=>setTermYears(Math.min(25,Math.max(5,Number(e.target.value))))}
                    className={inp}/>
                  <span className="text-xs text-slate-500 shrink-0">{termYears*12} meses</span>
                </div>
              </Field>

              <Field label="Tipo de Tasa">
                <select value={rateType} onChange={e=>setRateType(e.target.value as "TEA"|"TNA")} className={sel}>
                  <option value="TEA">Efectiva Anual (TEA)</option>
                  <option value="TNA">Nominal Anual (TNA)</option>
                </select>
              </Field>

              <Field label={`Interés ${rateType} (%)`}>
                <input type="number" step="0.0001" min="0.0001" max="99"
                  value={annualRate} onChange={e=>setAnnualRate(e.target.value)}
                  className={inp} placeholder="Ej: 12.0000"/>
              </Field>

              {rateType==="TNA" && (
                <Field label="Capitalización (veces/año)">
                  <select value={capPerYear} onChange={e=>setCapPerYear(Number(e.target.value))} className={sel}>
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
                <input type="number" step="0.0001" min="0"
                  value={desgravamen} onChange={e=>setDesgravamen(e.target.value)}
                  className={inp} placeholder="Ej: 0.0350"/>
              </Field>

              <Field label="Seg. Inmueble anual (%)">
                <input type="number" step="0.0001" min="0"
                  value={propInsurance} onChange={e=>setPropInsurance(e.target.value)}
                  className={inp} placeholder="Ej: 0.0300"/>
              </Field>

              <Field label="Portes Mensual (S/)">
                <input type="number" min="0"
                  value={portesMensual} onChange={e=>setPortesMensual(e.target.value)}
                  className={inp} placeholder="0"/>
              </Field>

              <Field label="Gracia Total (meses)">
                <input type="number" min={0} max={termYears*12-1}
                  value={graceTotalMonths} onChange={e=>setGraceTotalMonths(Math.max(0,Number(e.target.value)))}
                  className={inp}/>
              </Field>
            </div>
          </Section>

          {/* SECCIÓN 3: Costos y Gastos */}
          <Section icon={<DollarSign className="h-4 w-4"/>} title="Costos y Gastos Adicionales">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Field label="Costos Notariales (S/)">
                <input type="number" min="0" value={costoNotarial} onChange={e=>setCostoNotarial(e.target.value)} className={inp} placeholder="0"/>
              </Field>
              <Field label="Costos Registrales (S/)">
                <input type="number" min="0" value={costoRegistral} onChange={e=>setCostoRegistral(e.target.value)} className={inp} placeholder="0"/>
              </Field>
              <Field label="Tasación (S/)">
                <input type="number" min="0" value={tasacion} onChange={e=>setTasacion(e.target.value)} className={inp} placeholder="0"/>
              </Field>
              <Field label="Comisión de Estudio (S/)">
                <input type="number" min="0" value={comisionEstudio} onChange={e=>setComisionEstudio(e.target.value)} className={inp} placeholder="0"/>
              </Field>
              <Field label="Comisión de Activación (S/)">
                <input type="number" min="0" value={comisionActivacion} onChange={e=>setComisionActivacion(e.target.value)} className={inp} placeholder="0"/>
              </Field>
              <Field label="Comisión Periódica (S/mes)">
                <input type="number" min="0" value={comisionPeriodica} onChange={e=>setComisionPeriodica(e.target.value)} className={inp} placeholder="0"/>
              </Field>
              <Field label="Gastos Administrativos (S/mes)">
                <input type="number" min="0" value={gastosAdmin} onChange={e=>setGastosAdmin(e.target.value)} className={inp} placeholder="0"/>
              </Field>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              * Costos Notariales, Registrales, Tasación, Estudio y Activación son costos iniciales (afectan TCEA/VAN/TIR).
              Comisión Periódica y Gastos Admin se suman a la cuota mensual.
            </p>
          </Section>

          {/* SECCIÓN 4: Evaluación */}
          <Section icon={<BarChart3 className="h-4 w-4"/>} title="Parámetros de Evaluación">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="COK anual (%)">
                <input type="number" step="0.01" min="0.01" value={cok}
                  onChange={e=>setCok(e.target.value)} className={inp} placeholder="Ej: 12"/>
              </Field>
              <Field label="Gracia Parcial (meses)">
                <input type="number" min={0} max={termYears*12-1} value={gracePartialMonths}
                  onChange={e=>setGracePartialMonths(Math.max(0,Number(e.target.value)))} className={inp}/>
              </Field>
              <Field label="¿Aplica Bono Techo Propio / BBP?">
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="bono" checked={!applyBono} onChange={()=>setApplyBono(false)} className="accent-green-600"/>
                    <span className="text-sm text-slate-700">No aplica</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="bono" checked={applyBono} onChange={()=>setApplyBono(true)} className="accent-green-600"/>
                    <span className="text-sm text-slate-700">Sí aplica</span>
                  </label>
                </div>
              </Field>
              {applyBono && (
                <Field label="Monto del Bono (S/)">
                  <input type="number" min="0" value={bonusAmount}
                    onChange={e=>setBonusAmount(e.target.value)} className={inp} placeholder="Ej: 20000"/>
                </Field>
              )}
            </div>
          </Section>

          <div className="flex justify-end pb-2">
            <button onClick={runSimulation} disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50">
              <Calculator className="h-4 w-4"/>
              {loading ? "Calculando..." : "Calcular Simulación"}
            </button>
          </div>
        </div>

        {/* ── RESULTADOS (scroll independiente) ── */}
        {results && (
          <div ref={resultsRef} className="w-full lg:w-[480px] xl:w-[540px] shrink-0 overflow-y-auto space-y-4 pl-1 pb-6">

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Resultados</h2>
              <div className="flex gap-2">
                <button
                  onClick={()=>exportExcel(results, results.currency, entityData?.name??"Banco",
                    clientData?`${clientData.names} ${clientData.last_names}`:"Cliente",
                    propData?.name??"Inmueble")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-green-600"/> Excel
                </button>
                <button
                  onClick={()=>exportPDF(results, results.currency, entityData?.name??"Banco",
                    clientData?`${clientData.names} ${clientData.last_names}`:"Cliente",
                    propData?.name??"Inmueble", termYears, rateType, annualRate, cok)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                  <Download className="h-3.5 w-3.5 text-rose-500"/> PDF
                </button>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0"/> Simulación guardada correctamente.
              </div>
            )}

            {results.exchangeRateUsed !== 1 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                💱 T.C. usado: <strong>1 USD = {n2(results.exchangeRateUsed)} PEN</strong>. Valores en PEN.
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Cuota mensual base" value={fmt(results.monthlyPayment,"PEN")} sub="Sin seguros ni portes" color="green"/>
              <KPI label="TEM"  value={fmtP(results.tem)}  sub="Tasa Efectiva Mensual" color="blue"/>
              <KPI label="TCEA" value={results.tcea>0?fmtPs(results.tcea):"N/D"} sub="Costo Efectivo Anual" color="purple"/>
              <KPI label="VAN"  value={fmt(results.van,"PEN")} sub={`COK ${cok}% anual`} color={results.van>=0?"green":"red"}/>
              <KPI label="TIR anual" value={results.tir>0?fmtPs(results.tir):"N/D"} sub="Tasa Interna de Retorno" color="orange"/>
              <KPI label="Principal (PEN)" value={fmt(results.principalPEN,"PEN")} sub="Monto a financiar" color="blue"/>
            </div>

            {/* Detalle */}
            <div className="grid grid-cols-2 gap-2">
              <Chip label={`${results.rateType} ingresada`}   value={fmtPs(results.annualRate)}/>
              <Chip label="Plazo"                              value={`${termYears} años · ${termYears*12}m`}/>
              <Chip label="Cuota total (con seguros)"          value={fmt(results.schedule.find(r=>!r.isGrace)?.totalPayment??0,"PEN")}/>
              <Chip label="Gracia"                             value={`Total: ${graceTotalMonths}m / Parcial: ${gracePartialMonths}m`}/>
            </div>

            {/* Cronograma */}
            <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-700"/>
                  <span className="font-semibold text-slate-800 text-sm">Cronograma de Pagos</span>
                </div>
                <button onClick={()=>setShowSchedule(v=>!v)} className="text-xs font-medium text-green-700 hover:underline">
                  {showSchedule?"Ver menos":"Ver completo"}
                </button>
              </div>
              <div className="px-4 py-3">
                <SchedTable rows={results.schedule.slice(0, showSchedule?undefined:6)}/>
                {!showSchedule && results.schedule.length>6 && (
                  <div className="mt-2 text-center text-xs text-slate-400">... y {results.schedule.length-6} periodos más</div>
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
function Section({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}) {
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

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <div><div className="mb-1 text-xs font-medium text-slate-600">{label}</div>{children}</div>;
}

function Chip({label,value}:{label:string;value:string}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{value}</div>
    </div>
  );
}

const colors: Record<string,string> = {
  green:"bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue:"bg-sky-50 text-sky-700 ring-sky-200",
  purple:"bg-violet-50 text-violet-700 ring-violet-200",
  red:"bg-rose-50 text-rose-700 ring-rose-200",
  orange:"bg-amber-50 text-amber-700 ring-amber-200",
};

function KPI({label,value,sub,color}:{label:string;value:string;sub:string;color:string}) {
  return (
    <div className={`rounded-xl p-3.5 ring-1 ${colors[color]??colors.green}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-base font-bold leading-tight">{value}</div>
      <div className="mt-0.5 text-xs opacity-70">{sub}</div>
    </div>
  );
}

function SchedTable({rows}:{rows:ScheduleRow[]}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            {["N°","Base","Interés","Amort.","Desg.","Seg.","Total","Saldo"].map(h=>(
              <th key={h} className="whitespace-nowrap px-2.5 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.period} className={`border-t border-slate-100 ${r.isGrace?"bg-amber-50/60":"hover:bg-slate-50"}`}>
              <td className="px-2.5 py-1.5 font-medium text-slate-700">
                {r.period}{r.isGrace&&<span className="ml-1 rounded bg-amber-200 px-1 text-[9px] text-amber-800">G</span>}
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

const inp = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const sel = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";