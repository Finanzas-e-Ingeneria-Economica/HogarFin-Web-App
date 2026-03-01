"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Calculator,
  ChevronDown,
  User,
  Building2,
  TrendingUp,
  FileText,
  DollarSign,
  Info,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type Client = { id: number; names: string; last_names: string; dni: string };
type Property = { id: number; name: string; price: number; currency: "PEN" | "USD"; initial_payment: number; location: string };
type Entity = { id: number; name: string };
type RatePlan = { id: number; rate_type: "TEA" | "TNA"; annual_rate: number; capitalization_per_year: number; currency: string };
type BankConditions = {
  desgravamen_monthly_rate: number;
  property_insurance_annual_rate: number;
  monthly_fees_fixed: number;
  upfront_costs_fixed: number;
};

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
};

// ─────────────────────────────────────────────
// HELPERS FINANCIEROS
// ─────────────────────────────────────────────
function calcTEM(rateType: "TEA" | "TNA", annualRate: number, capPerYear: number): number {
  if (rateType === "TEA") {
    return Math.pow(1 + annualRate, 1 / 12) - 1;
  } else {
    const tea = Math.pow(1 + annualRate / capPerYear, capPerYear) - 1;
    return Math.pow(1 + tea, 1 / 12) - 1;
  }
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
  // Bisección
  let a = 0.000001;
  let b = 1;
  const vanFn = (r: number) => {
    let pv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      pv += cashflows[t] / Math.pow(1 + r, t + 1);
    }
    return -principal + pv;
  };
  if (vanFn(a) * vanFn(b) > 0) return -1;
  for (let i = 0; i < 200; i++) {
    const mid = (a + b) / 2;
    if (Math.abs(vanFn(mid)) < 0.0000001) return mid;
    if (vanFn(a) * vanFn(mid) < 0) b = mid;
    else a = mid;
  }
  return (a + b) / 2;
}

function calcTCEA(principal: number, cashflows: number[]): number {
  const tirMensual = calcTIR(principal, cashflows);
  if (tirMensual < 0) return -1;
  return Math.pow(1 + tirMensual, 12) - 1;
}

function generateSchedule(
  principal: number,
  tem: number,
  totalMonths: number,
  graceTotal: number,
  gracePartial: number,
  desgravamenRate: number,
  propertyInsuranceAnnual: number,
  propertyValue: number,
  monthlyFees: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let balance = principal;

  // Gracia total primero: capitaliza intereses
  for (let i = 1; i <= graceTotal; i++) {
    const interest = balance * tem;
    balance += interest;
    const desgravamen = balance * desgravamenRate;
    const propIns = (propertyValue * propertyInsuranceAnnual) / 12;
    const total = desgravamen + propIns + monthlyFees;
    rows.push({
      period: i,
      balance,
      interest,
      amort: 0,
      basePayment: 0,
      desgravamen,
      propertyInsurance: propIns,
      monthlyFees,
      totalPayment: total,
      cashflow: -total,
      isGrace: true,
    });
  }

  // Recalcular saldo después de gracia parcial (no cambia el saldo)
  const nRestante = totalMonths - graceTotal - gracePartial;
  const saldoPostGraciaTotal = balance;

  // Gracia parcial: paga solo intereses
  for (let i = graceTotal + 1; i <= graceTotal + gracePartial; i++) {
    const interest = balance * tem;
    const desgravamen = balance * desgravamenRate;
    const propIns = (propertyValue * propertyInsuranceAnnual) / 12;
    const total = interest + desgravamen + propIns + monthlyFees;
    rows.push({
      period: i,
      balance,
      interest,
      amort: 0,
      basePayment: interest,
      desgravamen,
      propertyInsurance: propIns,
      monthlyFees,
      totalPayment: total,
      cashflow: -total,
      isGrace: true,
    });
  }

  // Cuota normal con meses restantes
  const n = nRestante > 0 ? nRestante : totalMonths;
  const cuota = calcCuota(balance, tem, n);

  for (let i = graceTotal + gracePartial + 1; i <= totalMonths; i++) {
    const interest = balance * tem;
    let amort = cuota - interest;
    if (amort < 0) amort = 0;
    balance -= amort;
    if (balance < 0) balance = 0;

    const desgravamen = balance * desgravamenRate;
    const propIns = (propertyValue * propertyInsuranceAnnual) / 12;
    const total = cuota + desgravamen + propIns + monthlyFees;

    rows.push({
      period: i,
      balance,
      interest,
      amort,
      basePayment: cuota,
      desgravamen,
      propertyInsurance: propIns,
      monthlyFees,
      totalPayment: total,
      cashflow: -total,
      isGrace: false,
    });
  }

  return rows;
}

// ─────────────────────────────────────────────
// FORMATEADORES
// ─────────────────────────────────────────────
const fmt = (v: number, currency: "PEN" | "USD" = "PEN") =>
  `${currency === "USD" ? "$ " : "S/ "}${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;

const fmtPct = (v: number) => `${(v * 100).toFixed(4)}%`;
const fmtPctShort = (v: number) => `${(v * 100).toFixed(2)}%`;

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

  // Parámetros financieros
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
  const [termYears, setTermYears] = useState(20);
  const [rateType, setRateType] = useState<"TEA" | "TNA">("TEA");
  const [annualRate, setAnnualRate] = useState("12");
  const [capPerYear, setCapPerYear] = useState(12);
  const [desgravamen, setDesgravamen] = useState("0.035");
  const [propInsurance, setPropInsurance] = useState("0.030");
  const [graceTotalMonths, setGraceTotalMonths] = useState(0);

  // Costos adicionales
  const [costoNotarial, setCostoNotarial] = useState("0");
  const [costoRegistral, setCostoRegistral] = useState("0");
  const [tasacion, setTasacion] = useState("0");
  const [portesMensual, setPortesMensual] = useState("0");

  // Evaluación
  const [cok, setCok] = useState("12");
  const [gracePartialMonths, setGracePartialMonths] = useState(0);
  const [applyBono, setApplyBono] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("0");

  // Resultados
  const [results, setResults] = useState<SimResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAll();
  }, []);

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

  async function runSimulation() {
    setError(null);
    setSaved(false);
    if (!selectedClient) return setError("Selecciona un cliente.");
    if (!selectedProperty) return setError("Selecciona una propiedad.");
    if (!selectedEntity) return setError("Selecciona una entidad financiera.");

    const prop = properties.find((p) => p.id === selectedProperty)!;
    const rate = parseFloat(annualRate) / 100;
    if (isNaN(rate) || rate <= 0) return setError("La tasa de interés debe ser mayor a 0.");

    const cokAnnual = parseFloat(cok) / 100;
    if (isNaN(cokAnnual) || cokAnnual <= 0) return setError("El COK debe ser mayor a 0.");

    const bonus = applyBono ? parseFloat(bonusAmount) || 0 : 0;
    const principal = prop.price - prop.initial_payment - bonus;
    if (principal <= 0) return setError("El monto a financiar debe ser mayor a 0.");

    const totalMonths = termYears * 12;
    const graceTotal = graceTotalMonths;
    const gracePartial = gracePartialMonths;
    if (graceTotal + gracePartial >= totalMonths) return setError("Los meses de gracia no pueden superar el plazo total.");

    setLoading(true);

    const tem = calcTEM(rateType, rate, capPerYear);
    const desRate = parseFloat(desgravamen) / 100;
    const propInsRate = parseFloat(propInsurance) / 100;
    const portesM = parseFloat(portesMensual) || 0;
    const costoInicialTotal = (parseFloat(costoNotarial) || 0) + (parseFloat(costoRegistral) || 0) + (parseFloat(tasacion) || 0);

    const schedule = generateSchedule(
      principal, tem, totalMonths,
      graceTotal, gracePartial,
      desRate, propInsRate, prop.price, portesM
    );

    const cashflows = schedule.map((r) => r.totalPayment);
    const principalConCostos = principal + costoInicialTotal;

    const tcea = calcTCEA(principalConCostos, cashflows);
    const cokMonthly = Math.pow(1 + cokAnnual, 1 / 12) - 1;
    const van = calcVAN(principalConCostos, cashflows, cokMonthly);
    const tirMensual = calcTIR(principalConCostos, cashflows);
    const tirAnual = tirMensual > 0 ? Math.pow(1 + tirMensual, 12) - 1 : -1;

    // Cuota base (sin seguros) del primer periodo normal
    const firstNormal = schedule.find((r) => !r.isGrace);
    const monthlyPayment = firstNormal?.basePayment ?? 0;

    const simResults: SimResults = {
      monthlyPayment,
      tem,
      tcea,
      van,
      tir: tirAnual,
      schedule,
      principal,
      annualRate: rate,
      rateType,
    };

    setResults(simResults);
    setLoading(false);

    // Guardar en BD
    try {
      // Obtener rate_plan_id
      const { data: ratePlan } = await supabase
        .from("rate_plans")
        .select("id")
        .eq("entity_id", selectedEntity)
        .eq("currency", currency)
        .eq("rate_type", rateType)
        .limit(1)
        .single();

      const ratePlanId = ratePlan?.id ?? null;
      if (!ratePlanId) {
        setError("⚠️ Simulación calculada pero no se pudo guardar: no hay plan de tasas configurado para este banco/moneda.");
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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
          currency,
          property_value: prop.price,
          initial_payment: prop.initial_payment,
          bonus_amount: bonus,
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
          upfront_costs_fixed_used: costoInicialTotal,
          cok_monthly_used: cokMonthly,
          exchange_rate_used: 1,
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

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const cur = (selectedPropertyData?.currency ?? currency) as "PEN" | "USD";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nueva Simulación</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configura los parámetros del crédito MiVivienda y obtén el cronograma de pagos, VAN y TIR.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── SECCIÓN 1: CLIENTE Y PROPIEDAD ── */}
      <Section icon={<User className="h-4 w-4" />} title="Cliente e Inmueble">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Cliente">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(Number(e.target.value) || "")}
              className={selectCls}
            >
              <option value="">— Selecciona un cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names} {c.last_names} · DNI {c.dni}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Inmueble">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(Number(e.target.value) || "")}
              className={selectCls}
            >
              <option value="">— Selecciona un inmueble —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.currency === "USD" ? "$" : "S/"} {p.price.toLocaleString("es-PE")}
                </option>
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

      {/* ── SECCIÓN 2: PARÁMETROS FINANCIEROS ── */}
      <Section icon={<TrendingUp className="h-4 w-4" />} title="Parámetros Financieros">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Entidad Financiera">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(Number(e.target.value) || "")}
              className={selectCls}
            >
              <option value="">— Selecciona banco —</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Moneda">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")} className={selectCls}>
              <option value="PEN">PEN (Soles)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </Field>

          <Field label="Plazo (años)">
            <div className="flex items-center gap-2">
              <input
                type="number" min={10} max={30} value={termYears}
                onChange={(e) => setTermYears(Math.min(30, Math.max(10, Number(e.target.value))))}
                className={inputCls}
              />
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
            <input
              type="number" step="0.01" min="0.01" max="99"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              className={inputCls}
              placeholder="Ej: 12.00"
            />
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
            <input
              type="number" step="0.001" min="0"
              value={desgravamen}
              onChange={(e) => setDesgravamen(e.target.value)}
              className={inputCls}
              placeholder="Ej: 0.035"
            />
          </Field>

          <Field label="Seg. Inmueble anual (%)">
            <input
              type="number" step="0.001" min="0"
              value={propInsurance}
              onChange={(e) => setPropInsurance(e.target.value)}
              className={inputCls}
              placeholder="Ej: 0.030"
            />
          </Field>

          <Field label="Gracia Total (meses)">
            <input
              type="number" min={0} max={termYears * 12 - 1}
              value={graceTotalMonths}
              onChange={(e) => setGraceTotalMonths(Math.max(0, Number(e.target.value)))}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* ── SECCIÓN 3: COSTOS Y GASTOS ── */}
      <Section icon={<DollarSign className="h-4 w-4" />} title="Costos y Gastos Adicionales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* ── SECCIÓN 4: PARÁMETROS DE EVALUACIÓN ── */}
      <Section icon={<BarChart3 className="h-4 w-4" />} title="Parámetros de Evaluación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tasa de Descuento COK anual (%)">
            <input
              type="number" step="0.01" min="0.01"
              value={cok}
              onChange={(e) => setCok(e.target.value)}
              className={inputCls}
              placeholder="Ej: 12"
            />
          </Field>

          <Field label="Gracia Parcial (meses)">
            <input
              type="number" min={0} max={termYears * 12 - 1}
              value={gracePartialMonths}
              onChange={(e) => setGracePartialMonths(Math.max(0, Number(e.target.value)))}
              className={inputCls}
            />
          </Field>

          <Field label="¿Aplica Bono Techo Propio / BBP?">
            <div className="flex items-center gap-3 mt-1">
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
              <input
                type="number" min="0"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                className={inputCls}
                placeholder="Ej: 20000"
              />
            </Field>
          )}
        </div>
      </Section>

      {/* BOTÓN CALCULAR */}
      <div className="flex justify-end">
        <button
          onClick={runSimulation}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
        >
          <Calculator className="h-4 w-4" />
          {loading ? "Calculando..." : "Calcular Simulación"}
        </button>
      </div>

      {/* ── RESULTADOS ── */}
      {results && (
        <div ref={resultsRef} className="space-y-6">

          {saved && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Simulación guardada correctamente en la base de datos.
            </div>
          )}

          {/* KPIs principales */}
          <Section icon={<FileText className="h-4 w-4" />} title="Resultados de la Simulación">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <KPICard
                label="Cuota mensual base"
                value={fmt(results.monthlyPayment, cur)}
                sub="Sin seguros ni portes"
                color="green"
              />
              <KPICard
                label="TEM"
                value={fmtPct(results.tem)}
                sub="Tasa Efectiva Mensual"
                color="blue"
              />
              <KPICard
                label="TCEA"
                value={results.tcea > 0 ? fmtPctShort(results.tcea) : "N/D"}
                sub="Costo Efectivo Anual"
                color="purple"
              />
              <KPICard
                label="VAN"
                value={fmt(results.van, cur)}
                sub={`COK ${cok}% anual`}
                color={results.van >= 0 ? "green" : "red"}
              />
              <KPICard
                label="TIR anual"
                value={results.tir > 0 ? fmtPctShort(results.tir) : "N/D"}
                sub="Tasa Interna de Retorno"
                color="orange"
              />
            </div>

            {/* Detalle adicional */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoChip label="Monto financiado" value={fmt(results.principal, cur)} />
              <InfoChip label={`${results.rateType} ingresada`} value={fmtPctShort(results.annualRate)} />
              <InfoChip label="Plazo total" value={`${termYears} años (${termYears * 12} meses)`} />
              <InfoChip
                label="Cuota total (con seguros)"
                value={fmt((results.schedule.find((r) => !r.isGrace)?.totalPayment ?? 0), cur)}
              />
            </div>
          </Section>

          {/* Cronograma */}
          <Section icon={<Clock className="h-4 w-4" />} title="Cronograma de Pagos">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">{results.schedule.length} periodos en total</p>
              <button
                onClick={() => setShowSchedule((v) => !v)}
                className="text-xs font-medium text-green-700 hover:underline"
              >
                {showSchedule ? "Ocultar tabla" : "Ver tabla completa"}
              </button>
            </div>

            {/* Primeras 3 filas siempre visibles */}
            <ScheduleTable rows={results.schedule.slice(0, showSchedule ? undefined : 6)} currency={cur} />

            {!showSchedule && results.schedule.length > 6 && (
              <div className="mt-2 text-center text-xs text-slate-400">
                ... y {results.schedule.length - 6} periodos más
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-700">
          {icon}
        </span>
        <span className="font-semibold text-slate-800">{title}</span>
      </div>
      <div className="px-5 py-5">{children}</div>
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
    <div className={`rounded-xl p-4 ring-1 ${colorMap[color] ?? colorMap.green}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-lg font-bold leading-tight">{value}</div>
      <div className="mt-1 text-xs opacity-70">{sub}</div>
    </div>
  );
}

function ScheduleTable({ rows, currency }: { rows: ScheduleRow[]; currency: "PEN" | "USD" }) {
  const f = (v: number) => fmt(v, currency);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-600">
            {["N°", "Cuota base", "Interés", "Amortización", "Desgravamen", "Seg. Inmueble", "Cuota total", "Saldo"].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.period}
              className={`border-t border-slate-100 ${r.isGrace ? "bg-amber-50/60" : "hover:bg-slate-50"}`}
            >
              <td className="px-3 py-2 font-medium text-slate-700">
                {r.period}
                {r.isGrace && <span className="ml-1 rounded bg-amber-200 px-1 text-[10px] text-amber-800">G</span>}
              </td>
              <td className="px-3 py-2">{f(r.basePayment)}</td>
              <td className="px-3 py-2">{f(r.interest)}</td>
              <td className="px-3 py-2">{f(r.amort)}</td>
              <td className="px-3 py-2">{f(r.desgravamen)}</td>
              <td className="px-3 py-2">{f(r.propertyInsurance)}</td>
              <td className="px-3 py-2 font-semibold text-slate-900">{f(r.totalPayment)}</td>
              <td className="px-3 py-2 text-slate-600">{f(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Clases reutilizables
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const selectCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";