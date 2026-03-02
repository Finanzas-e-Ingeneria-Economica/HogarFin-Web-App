"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  TrendingUp,
  User,
  Zap,
  CheckCircle2,
  Calculator,
  History,
} from "lucide-react";

import type { Client, Entity, Property, SimResults } from "./_utils/types";
import { calcTEM, calcTIR, calcVAN, generateSchedule } from "./_utils/finance";

import Section from "./_components/Section";
import Field from "./_components/Field";
import Chip from "./_components/Chip";
import ResultsBlock from "./_components/ResultsBlock";

const inp =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const sel =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";

export default function SimulatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  const [selectedClient, setSelectedClient] = useState<number | "">("");
  const [selectedProperty, setSelectedProperty] = useState<number | "">("");
  const [selectedEntity, setSelectedEntity] = useState<number | "">("");

  const [termYears, setTermYears] = useState(20);
  const [rateType, setRateType] = useState<"TEA" | "TNA">("TEA");
  const [annualRate, setAnnualRate] = useState("");
  const [capPerYear, setCapPerYear] = useState(12);
  const [desgravamen, setDesgravamen] = useState("");
  const [propInsurance, setPropInsurance] = useState("");
  const [portesMensual, setPortesMensual] = useState("");

  const [bankLoading, setBankLoading] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);

  const [graceTotalMonths, setGraceTotalMonths] = useState(0);
  const [gracePartialMonths, setGracePartialMonths] = useState(0);

  const [costoNotarial, setCostoNotarial] = useState("");
  const [costoRegistral, setCostoRegistral] = useState("");
  const [tasacion, setTasacion] = useState("");
  const [comisionEstudio, setComisionEstudio] = useState("");
  const [comisionActivacion, setComisionActivacion] = useState("");
  const [comisionPeriodica, setComisionPeriodica] = useState("");
  const [gastosAdmin, setGastosAdmin] = useState("");

  const [cok, setCok] = useState("12");
  const [applyBono, setApplyBono] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");

  const [results, setResults] = useState<SimResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      supabase
        .from("clients")
        .select("id,names,last_names,dni")
        .eq("user_id", uid)
        .order("names"),
      supabase
        .from("properties")
        .select("id,name,price,currency,initial_payment,location")
        .eq("user_id", uid)
        .order("name"),
      supabase.from("financial_entities").select("id,name").order("name"),
    ]);

    if (cls) setClients(cls as Client[]);
    if (props) setProperties(props as Property[]);
    if (ents) setEntities(ents as Entity[]);
  }

  async function onEntityChange(entityId: number | "") {
    setSelectedEntity(entityId);
    setBankLoaded(false);

    if (!entityId) {
      setAnnualRate("");
      setCapPerYear(12);
      setDesgravamen("");
      setPropInsurance("");
      setPortesMensual("");
      return;
    }

    setBankLoading(true);

    const { data: rp } = await supabase
      .from("rate_plans")
      .select("rate_type, annual_rate, capitalization_per_year")
      .eq("entity_id", entityId)
      .eq("currency", "PEN")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: bc } = await supabase
      .from("bank_conditions")
      .select(
        "desgravamen_monthly_rate, property_insurance_annual_rate, monthly_fees_fixed",
      )
      .eq("entity_id", entityId)
      .eq("currency", "PEN")
      .eq("is_active", true)
      .maybeSingle();

    if (rp) {
      setRateType(rp.rate_type as "TEA" | "TNA");
      setAnnualRate((Number(rp.annual_rate) * 100).toFixed(4));
      setCapPerYear(Number(rp.capitalization_per_year) || 12);
    }

    if (bc) {
      setDesgravamen((Number(bc.desgravamen_monthly_rate) * 100).toFixed(4));
      setPropInsurance(
        (Number(bc.property_insurance_annual_rate) * 100).toFixed(4),
      );
      setPortesMensual(Number(bc.monthly_fees_fixed).toFixed(2));
    }

    setBankLoading(false);
    if (rp || bc) setBankLoaded(true);
  }

  const propData = useMemo(
    () => properties.find((p) => p.id === selectedProperty),
    [properties, selectedProperty],
  );
  const entityData = useMemo(
    () => entities.find((e) => e.id === selectedEntity),
    [entities, selectedEntity],
  );
  const clientData = useMemo(
    () => clients.find((c) => c.id === selectedClient),
    [clients, selectedClient],
  );

  async function runSimulation() {
    setError(null);
    setSaved(false);
    setResults(null);
    setShowSchedule(false);

    if (!selectedClient) return setError("Selecciona un cliente.");
    if (!selectedProperty) return setError("Selecciona una propiedad.");
    if (!selectedEntity) return setError("Selecciona una entidad financiera.");
    if (!annualRate) return setError("La tasa de interés es obligatoria.");

    const prop = properties.find((p) => p.id === selectedProperty);
    if (!prop) return setError("No se encontró la propiedad seleccionada.");

    const rate = Number(annualRate) / 100;
    if (!Number.isFinite(rate) || rate <= 0)
      return setError("La tasa debe ser mayor a 0.");

    const cokA = Number(cok) / 100;
    if (!Number.isFinite(cokA) || cokA <= 0)
      return setError("El COK debe ser mayor a 0.");

    const totalMonths = termYears * 12;
    const gT = Math.max(0, graceTotalMonths);
    const gP = Math.max(0, gracePartialMonths);
    if (gT + gP >= totalMonths)
      return setError("Los meses de gracia no pueden superar el plazo total.");

    setLoading(true);

    let fxRate = 1;
    let pricePEN = prop.price;
    let initPEN = prop.initial_payment;

    if (prop.currency === "USD") {
      const { data: fx } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("currency_from", "USD")
        .eq("currency_to", "PEN")
        .eq("is_active", true)
        .maybeSingle();

      fxRate = Number(fx?.rate) || 3.75;
      pricePEN = prop.price * fxRate;
      initPEN = prop.initial_payment * fxRate;
    }

    const bonus = applyBono ? Number(bonusAmount) || 0 : 0;
    const bonusPEN = prop.currency === "USD" ? bonus * fxRate : bonus;

    const tem = calcTEM(rateType, rate, capPerYear);

    const desRate = (Number(desgravamen) || 0) / 100;
    const insRate = (Number(propInsurance) || 0) / 100;

    const portesM = Number(portesMensual) || 0;
    const portesTotal =
      portesM + (Number(comisionPeriodica) || 0) + (Number(gastosAdmin) || 0);

    const costoInicial =
      (Number(costoNotarial) || 0) +
      (Number(costoRegistral) || 0) +
      (Number(tasacion) || 0) +
      (Number(comisionEstudio) || 0) +
      (Number(comisionActivacion) || 0);

    const principalBase = pricePEN - initPEN - bonusPEN;
    const principal = principalBase + costoInicial;

    if (principal <= 0) {
      setLoading(false);
      return setError("El monto a financiar debe ser mayor a 0.");
    }

    const schedule = generateSchedule(
      principal,
      tem,
      totalMonths,
      gT,
      gP,
      desRate,
      insRate,
      pricePEN,
      portesTotal,
    );

    const cashflows = schedule.map((r) => r.cashflow);

    // ✅ NUEVO: TIR MENSUAL (la del Excel del profe: "TIR periodo")
    const tirM = calcTIR(principal, cashflows);

    // ✅ NUEVO: anualización (si quieres seguir mostrando “TIR anual” aparte)
    const tirA = tirM > 0 ? Math.pow(1 + tirM, 12) - 1 : -1;

    // TCEA (en tu caso lo estás tratando como anualización de la IRR mensual)
    const tcea = tirA;

    const cokM = Math.pow(1 + cokA, 1 / 12) - 1;
    const van = calcVAN(principal, cashflows, cokM);

    const monthlyPayment = schedule.find((r) => !r.isGrace)?.basePayment ?? 0;

    const simResults: SimResults = {
      monthlyPayment,
      tem,
      tcea,
      van,
      
      // ✅ NUEVO: para que calce con el Excel del profe
      tirM: tirM, // <- “TIR periodo” (mensual)

      // opcional: si quieres seguir teniendo “TIR anual”
      tirA: tirA, // <- anualizada

      schedule,
      principal,
      annualRate: rate,
      rateType,
      currency: prop.currency,
      exchangeRateUsed: fxRate,
      principalPEN: principal,
    };

    setResults(simResults);
    setLoading(false);

    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      120,
    );

    try {
      const { data: rp } = await supabase
        .from("rate_plans")
        .select("id")
        .eq("entity_id", selectedEntity)
        .eq("currency", "PEN")
        .eq("rate_type", rateType)
        .limit(1)
        .maybeSingle();

      if (!rp) return;

      const { data: sim } = await supabase
        .from("loan_simulations")
        .insert({
          user_id: userId,
          client_id: selectedClient,
          property_id: selectedProperty,
          entity_id: selectedEntity,
          rate_plan_id: rp.id,
          currency: "PEN",
          property_value: pricePEN,
          initial_payment: initPEN,
          bonus_amount: bonusPEN,
          principal,
          term_months: totalMonths,
          annual_rate_used: rate,
          rate_type_used: rateType,
          capitalization_per_year_used: capPerYear,
          monthly_rate: tem,
          monthly_payment: monthlyPayment,
          grace_type: gT > 0 ? "TOTAL" : gP > 0 ? "PARTIAL" : "NONE",
          grace_months: gT > 0 ? gT : gP,
          tcea: tcea > 0 ? tcea : null,
          van,

          // aquí puedes guardar la anual o la mensual (lo ideal: guarda ambas en columnas separadas si quieres)
          tir: tirA > 0 ? tirA : null,

          desgravamen_monthly_rate_used: desRate,
          property_insurance_annual_rate_used: insRate,
          monthly_fees_fixed_used: portesTotal,
          upfront_costs_fixed_used: costoInicial,
          cok_monthly_used: cokM,
          exchange_rate_used: fxRate,
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
          })),
        );
        setSaved(true);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Nueva Simulación
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Crédito MiVivienda — Método Francés Vencido Ordinario
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/simulate/history")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <History className="h-4 w-4 text-green-600" />
            Ver Historial
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 space-y-5">
          <Section
            icon={<User className="h-4 w-4" />}
            title="Cliente e Inmueble"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Cliente">
                <select
                  value={selectedClient}
                  onChange={(e) =>
                    setSelectedClient(Number(e.target.value) || "")
                  }
                  className={sel}
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
                  onChange={(e) =>
                    setSelectedProperty(Number(e.target.value) || "")
                  }
                  className={sel}
                >
                  <option value="">— Selecciona un inmueble —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.currency === "USD" ? "$" : "S/"}{" "}
                      {p.price.toLocaleString("es-PE")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {propData && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Chip
                  label="Precio"
                  value={`${propData.currency === "USD" ? "$" : "S/"} ${new Intl.NumberFormat(
                    "es-PE",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  ).format(propData.price)}`}
                />
                <Chip
                  label="Cuota inicial"
                  value={`${propData.currency === "USD" ? "$" : "S/"} ${new Intl.NumberFormat(
                    "es-PE",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  ).format(propData.initial_payment)}`}
                />
                <Chip label="Moneda" value={propData.currency} />
                <Chip label="Ubicación" value={propData.location} />
              </div>
            )}
          </Section>

          <Section
            icon={<TrendingUp className="h-4 w-4" />}
            title="Parámetros Financieros"
          >
            <div className="mb-4">
              <Field label="Entidad Financiera">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedEntity}
                    onChange={(e) =>
                      onEntityChange(Number(e.target.value) || "")
                    }
                    className={sel + " flex-1"}
                  >
                    <option value="">— Selecciona banco —</option>
                    {entities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>

                  {bankLoading && (
                    <span className="shrink-0 animate-pulse text-xs text-slate-400">
                      Cargando...
                    </span>
                  )}

                  {bankLoaded && !bankLoading && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                      <Zap className="h-3 w-3" /> Datos cargados
                    </span>
                  )}
                </div>
              </Field>
            </div>

            {bankLoaded && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Los parámetros de <strong>{entityData?.name}</strong> fueron
                autocompletados. Puedes editarlos si es necesario.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Plazo (años)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={25}
                    value={termYears}
                    onChange={(e) =>
                      setTermYears(
                        Math.min(25, Math.max(5, Number(e.target.value) || 5)),
                      )
                    }
                    className={inp}
                  />
                  <span className="shrink-0 text-xs text-slate-500">
                    {termYears * 12} meses
                  </span>
                </div>
              </Field>

              <Field label="Tipo de Tasa">
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as "TEA" | "TNA")}
                  className={sel}
                >
                  <option value="TEA">Efectiva Anual (TEA)</option>
                  <option value="TNA">Nominal Anual (TNA)</option>
                </select>
              </Field>

              <Field label={`Interés ${rateType} (%)`}>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="99"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  className={inp}
                  placeholder="Ej: 12.0000"
                />
              </Field>

              {rateType === "TNA" && (
                <Field label="Capitalización (veces/año)">
                  <select
                    value={capPerYear}
                    onChange={(e) => setCapPerYear(Number(e.target.value))}
                    className={sel}
                  >
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
                  type="number"
                  step="0.0001"
                  min="0"
                  value={desgravamen}
                  onChange={(e) => setDesgravamen(e.target.value)}
                  className={inp}
                  placeholder="Ej: 0.0350"
                />
              </Field>

              <Field label="Seg. Inmueble anual (%)">
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={propInsurance}
                  onChange={(e) => setPropInsurance(e.target.value)}
                  className={inp}
                  placeholder="Ej: 0.0300"
                />
              </Field>

              <Field label="Portes Mensual (S/)">
                <input
                  type="number"
                  min="0"
                  value={portesMensual}
                  onChange={(e) => setPortesMensual(e.target.value)}
                  className={inp}
                  placeholder="Ej: 0.00"
                />
              </Field>

              <Field label="Gracia Total (meses)">
                <input
                  type="number"
                  min={0}
                  max={termYears * 12 - 1}
                  value={graceTotalMonths}
                  onChange={(e) =>
                    setGraceTotalMonths(
                      Math.max(0, Number(e.target.value) || 0),
                    )
                  }
                  className={inp}
                  placeholder="Ej: 0"
                />
              </Field>
            </div>
          </Section>

          <Section
            icon={<DollarSign className="h-4 w-4" />}
            title="Costos y Gastos Adicionales"
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Field label="Costos Notariales (S/)">
                <input
                  type="number"
                  min="0"
                  value={costoNotarial}
                  onChange={(e) => setCostoNotarial(e.target.value)}
                  className={inp}
                  placeholder="Ej: 1500"
                />
              </Field>

              <Field label="Costos Registrales (S/)">
                <input
                  type="number"
                  min="0"
                  value={costoRegistral}
                  onChange={(e) => setCostoRegistral(e.target.value)}
                  className={inp}
                  placeholder="Ej: 900"
                />
              </Field>

              <Field label="Tasación (S/)">
                <input
                  type="number"
                  min="0"
                  value={tasacion}
                  onChange={(e) => setTasacion(e.target.value)}
                  className={inp}
                  placeholder="Ej: 450"
                />
              </Field>

              <Field label="Comisión de Estudio (S/)">
                <input
                  type="number"
                  min="0"
                  value={comisionEstudio}
                  onChange={(e) => setComisionEstudio(e.target.value)}
                  className={inp}
                  placeholder="Ej: 250"
                />
              </Field>

              <Field label="Comisión de Activación (S/)">
                <input
                  type="number"
                  min="0"
                  value={comisionActivacion}
                  onChange={(e) => setComisionActivacion(e.target.value)}
                  className={inp}
                  placeholder="Ej: 300"
                />
              </Field>

              <Field label="Comisión Periódica (S/mes)">
                <input
                  type="number"
                  min="0"
                  value={comisionPeriodica}
                  onChange={(e) => setComisionPeriodica(e.target.value)}
                  className={inp}
                  placeholder="Ej: 10"
                />
              </Field>

              <Field label="Gastos Administrativos (S/mes)">
                <input
                  type="number"
                  min="0"
                  value={gastosAdmin}
                  onChange={(e) => setGastosAdmin(e.target.value)}
                  className={inp}
                  placeholder="Ej: 5"
                />
              </Field>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              * Costos Notariales, Registrales, Tasación, Estudio y Activación
              son costos iniciales (afectan TCEA/VAN/TIR). Comisión Periódica y
              Gastos Admin se suman a la cuota mensual.
            </p>
          </Section>

          <Section
            icon={<BarChart3 className="h-4 w-4" />}
            title="Parámetros de Evaluación"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="COK anual (%)">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={cok}
                  onChange={(e) => setCok(e.target.value)}
                  className={inp}
                  placeholder="Ej: 12"
                />
              </Field>

              <Field label="Gracia Parcial (meses)">
                <input
                  type="number"
                  min={0}
                  max={termYears * 12 - 1}
                  value={gracePartialMonths}
                  onChange={(e) =>
                    setGracePartialMonths(
                      Math.max(0, Number(e.target.value) || 0),
                    )
                  }
                  className={inp}
                  placeholder="Ej: 0"
                />
              </Field>

              <Field label="¿Aplica Bono Techo Propio / BBP?">
                <div className="mt-1 flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="bono"
                      checked={!applyBono}
                      onChange={() => setApplyBono(false)}
                      className="accent-green-600"
                    />
                    <span className="text-sm text-slate-700">No aplica</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="bono"
                      checked={applyBono}
                      onChange={() => setApplyBono(true)}
                      className="accent-green-600"
                    />
                    <span className="text-sm text-slate-700">Sí aplica</span>
                  </label>
                </div>
              </Field>

              {applyBono && (
                <Field label="Monto del Bono (S/)">
                  <input
                    type="number"
                    min="0"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    className={inp}
                    placeholder="Ej: 20000"
                  />
                </Field>
              )}
            </div>
          </Section>

          <div className="flex justify-end pb-2">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
            >
              <Calculator className="h-4 w-4" />
              {loading ? "Calculando..." : "Calcular Simulación"}
            </button>
          </div>

          {results && (
            <div ref={resultsRef} className="pt-1">
              <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
                <ResultsBlock
                  results={results}
                  saved={saved}
                  termYears={termYears}
                  rateType={rateType}
                  annualRate={annualRate}
                  cok={cok}
                  graceTotalMonths={graceTotalMonths}
                  gracePartialMonths={gracePartialMonths}
                  entityData={entityData}
                  clientData={clientData}
                  propData={propData}
                  showSchedule={showSchedule}
                  setShowSchedule={setShowSchedule}
                />

                <div className="mt-3 rounded-xl border border-slate-200 bg-white">
                  <div className="max-h-[420px] overflow-y-auto px-4 py-3">
                    {/* El ScheduleTable ya está dentro de ResultsBlock, este contenedor asegura scroll vertical */}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}