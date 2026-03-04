"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type BonoAuto = {
  applies: boolean;
  bonus: number;
  label: string;
  reason: string;
};

type SubsidyChoice = "NONE" | "TECHO_PROPIO" | "BBP";

function calcBBP(args: { pricePEN: number; initialPEN: number }): BonoAuto {
  const price = Number(args.pricePEN) || 0;
  const init = Number(args.initialPEN) || 0;

  if (!price || price <= 0)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Precio inválido" };

  if (init < 0)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Cuota inicial inválida" };

  const pct = price > 0 ? init / price : 0;
  if (pct < 0.075) {
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Cuota inicial mínima para MiVivienda + BBP: 7.5%",
    };
  }

  const tiers = [
    { min: 68800, max: 98100, bonus: 27400 },
    { min: 98100, max: 146900, bonus: 22800 },
    { min: 146900, max: 244600, bonus: 20900 },
    { min: 244600, max: 362800, bonus: 7800 },
    { min: 362800, max: 488800, bonus: 0 },
  ];

  const row = tiers.find((t) => price >= t.min && price <= t.max);

  if (!row) {
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Precio fuera del rango del Nuevo Crédito MiVivienda (para BBP).",
    };
  }

  if (row.bonus <= 0) {
    return { applies: false, bonus: 0, label: "No aplica", reason: "En este rango de precio no aplica BBP." };
  }

  const financed = price - init - row.bonus;
  if (financed <= 0) {
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "El valor de la vivienda (menos cuota inicial) no puede ser menor o igual al bono.",
    };
  }

  return {
    applies: true,
    bonus: row.bonus,
    label: "Bono del Buen Pagador (Tradicional)",
    reason: "Califica",
  };
}

function calcTechoPropioAVN(args: {
  monthlyIncome: number;
  dependents: number;
  propertyType: string;
  pricePEN: number;
  initialPEN: number;
}): BonoAuto {
  const income = Number(args.monthlyIncome) || 0;
  const deps = Number(args.dependents) || 0;
  const ptype = String(args.propertyType || "");
  const price = Number(args.pricePEN) || 0;
  const init = Number(args.initialPEN) || 0;

  if (!price || price <= 0)
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Precio inválido",
    };

  if (init < 0)
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Cuota inicial inválida",
    };

  if (deps < 1)
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Sin grupo familiar (dependientes)",
    };

  if (!["Casa", "Departamento"].includes(ptype))
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Tipo de inmueble no válido (solo Casa o Departamento)",
    };

  let candidate: BonoAuto = {
    applies: false,
    bonus: 0,
    label: "No aplica",
    reason: "Precio fuera del rango VIS",
  };

  if (income <= 2071) {
    if (ptype === "Casa" && price <= 60000) {
      candidate = {
        applies: true,
        bonus: 58300,
        label: "Techo Propio (VIS Priorizada)",
        reason: "Califica",
      };
    }
    if (ptype === "Departamento" && price <= 70000) {
      candidate = {
        applies: true,
        bonus: 53350,
        label: "Techo Propio (VIS Priorizada)",
        reason: "Califica",
      };
    }
  }

  if (!candidate.applies) {
    if (income > 3715) {
      return {
        applies: false,
        bonus: 0,
        label: "No aplica",
        reason: "Ingreso > 3,715",
      };
    }

    if (ptype === "Casa" && price <= 109000) {
      candidate = {
        applies: true,
        bonus: 52250,
        label: "Techo Propio (VIS)",
        reason: "Califica",
      };
    }
    if (ptype === "Departamento" && price <= 136000) {
      candidate = {
        applies: true,
        bonus: 47850,
        label: "Techo Propio (VIS)",
        reason: "Califica",
      };
    }
  }

  if (candidate.applies) {
    const financed = price - init - candidate.bonus;
    if (financed <= 0) {
      return {
        applies: false,
        bonus: 0,
        label: "No aplica",
        reason:
          "El valor de la vivienda (menos cuota inicial) no puede ser menor o igual al bono.",
      };
    }
  }

  return candidate;
}

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

  const [subsidyChoice, setSubsidyChoice] = useState<SubsidyChoice>("NONE");

  const [bonoTP, setBonoTP] = useState<BonoAuto>({
    applies: false,
    bonus: 0,
    label: "No aplica",
    reason: "Selecciona cliente e inmueble.",
  });

  const [bonoBBP, setBonoBBP] = useState<BonoAuto>({
    applies: false,
    bonus: 0,
    label: "No aplica",
    reason: "Selecciona inmueble.",
  });

  const [results, setResults] = useState<SimResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

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

  const fxCacheRef = useRef<number | null>(null);
  const getUsdPenRate = useCallback(async () => {
    if (fxCacheRef.current && fxCacheRef.current > 0) return fxCacheRef.current;

    const { data: fx } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("currency_from", "USD")
      .eq("currency_to", "PEN")
      .eq("is_active", true)
      .maybeSingle();

    const rate = Number(fx?.rate) || 3.75;
    fxCacheRef.current = rate;
    return rate;
  }, []);

  const loadAll = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);
    if (!uid) return;

    const [{ data: cls }, { data: props }] = await Promise.all([
      supabase
        .from("clients")
        .select("id,names,last_names,dni,monthly_income,dependents")
        .eq("user_id", uid)
        .order("names"),
      supabase
        .from("properties")
        .select("id,name,price,currency,initial_payment,location,property_type")
        .eq("user_id", uid)
        .order("name"),
    ]);

    setClients((cls ?? []) as Client[]);
    setProperties((props ?? []) as Property[]);
    setEntities([]);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onEntityChange = useCallback(async (entityId: number | "") => {
    setSelectedEntity(entityId);
    setBankLoaded(false);

    setRateType("TEA");
    setAnnualRate("");
    setCapPerYear(12);
    setDesgravamen("0");
    setPropInsurance("0");
    setPortesMensual("0");

    if (!entityId) return;

    setBankLoading(true);

    const [{ data: rp }, { data: bc }] = await Promise.all([
      supabase
        .from("rate_plans")
        .select("rate_type, annual_rate, capitalization_per_year")
        .eq("entity_id", entityId)
        .eq("currency", "PEN")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bank_conditions")
        .select(
          "desgravamen_monthly_rate, property_insurance_annual_rate, monthly_fees_fixed",
        )
        .eq("entity_id", entityId)
        .eq("currency", "PEN")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

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
    setBankLoaded(Boolean(rp || bc));
  }, []);

  const loadEligibleEntities = useCallback(
    async (pricePEN: number, termMonths: number) => {
      const { data, error } = await supabase
        .from("rate_tiers")
        .select("entity_id, financial_entities(id,name)")
        .eq("is_active", true)
        .eq("currency", "PEN")
        .lte("min_property_value", pricePEN)
        .or(`max_property_value.is.null,max_property_value.gte.${pricePEN}`)
        .lte("min_term_months", termMonths)
        .gte("max_term_months", termMonths);

      if (error) throw error;

      const map = new Map<number, Entity>();
      (data ?? []).forEach((row: any) => {
        const fe = row.financial_entities;
        if (fe?.id && fe?.name)
          map.set(Number(fe.id), { id: Number(fe.id), name: String(fe.name) });
      });

      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    },
    [],
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!propData) {
        if (!alive) return;
        setEntities([]);
        onEntityChange("");
        return;
      }

      const termMonths = termYears * 12;
      const fxRate = propData.currency === "USD" ? await getUsdPenRate() : 1;
      const pricePEN =
        propData.currency === "USD" ? propData.price * fxRate : propData.price;

      try {
        const list = await loadEligibleEntities(pricePEN, termMonths);
        if (!alive) return;
        setEntities(list);

        const stillValid = list.some((e) => e.id === selectedEntity);
        if (!stillValid) onEntityChange("");
      } catch {
        if (!alive) return;
        setEntities([]);
        onEntityChange("");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [
    propData,
    termYears,
    getUsdPenRate,
    loadEligibleEntities,
    selectedEntity,
    onEntityChange,
  ]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!propData) {
        if (!alive) return;
        setBonoTP({
          applies: false,
          bonus: 0,
          label: "No aplica",
          reason: "Selecciona cliente e inmueble.",
        });
        setBonoBBP({
          applies: false,
          bonus: 0,
          label: "No aplica",
          reason: "Selecciona inmueble.",
        });
        return;
      }

      const fxRate = propData.currency === "USD" ? await getUsdPenRate() : 1;
      const pricePEN =
        propData.currency === "USD" ? propData.price * fxRate : propData.price;
      const initPEN =
        propData.currency === "USD"
          ? propData.initial_payment * fxRate
          : propData.initial_payment;

      if (!clientData) {
        if (!alive) return;
        setBonoTP({
          applies: false,
          bonus: 0,
          label: "No aplica",
          reason: "Selecciona cliente e inmueble.",
        });
      } else {
        const rTP = calcTechoPropioAVN({
          monthlyIncome: Number(clientData.monthly_income) || 0,
          dependents: Number(clientData.dependents) || 0,
          propertyType: String(propData.property_type || ""),
          pricePEN,
          initialPEN: initPEN,
        });
        if (!alive) return;
        setBonoTP(rTP);
      }

      const rBBP = calcBBP({
        pricePEN,
        initialPEN: initPEN,
      });

      if (!alive) return;
      setBonoBBP(rBBP);
    }

    run();
    return () => {
      alive = false;
    };
  }, [clientData, propData, getUsdPenRate]);

  useEffect(() => {
    if (
      (subsidyChoice === "TECHO_PROPIO" && !bonoTP.applies) ||
      (subsidyChoice === "BBP" && !bonoBBP.applies)
    ) {
      setSubsidyChoice("NONE");
    }
  }, [subsidyChoice, bonoTP.applies, bonoBBP.applies]);

  const runSimulation = useCallback(async () => {
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

    const client = clients.find((c) => c.id === selectedClient);
    if (!client) return setError("No se encontró el cliente seleccionado.");

    const rate = Number(annualRate) / 100;
    if (!Number.isFinite(rate) || rate <= 0)
      return setError("La tasa debe ser mayor a 0.");

    const cokA = Number(cok) / 100;
    if (!Number.isFinite(cokA) || cokA <= 0)
      return setError("El COK debe ser mayor a 0.");

    if (graceTotalMonths + gracePartialMonths > 6)
      return setError("Los meses de gracia no pueden superar los 6 meses.");

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
      fxRate = await getUsdPenRate();
      pricePEN = prop.price * fxRate;
      initPEN = prop.initial_payment * fxRate;
    }

    const bonusPEN =
      subsidyChoice === "TECHO_PROPIO"
        ? bonoTP.applies
          ? bonoTP.bonus
          : 0
        : subsidyChoice === "BBP"
          ? bonoBBP.applies
            ? bonoBBP.bonus
            : 0
          : 0;

    if (subsidyChoice === "TECHO_PROPIO" && !bonoTP.applies) {
      setLoading(false);
      return setError(
        "Seleccionaste Techo Propio, pero no aplica para este caso.",
      );
    }
    if (subsidyChoice === "BBP" && !bonoBBP.applies) {
      setLoading(false);
      return setError(
        "Seleccionaste Buen Pagador, pero no aplica para este caso.",
      );
    }

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

    const tirM = calcTIR(principal, cashflows);
    const tirA = tirM > 0 ? Math.pow(1 + tirM, 12) - 1 : -1;
    const tcea = tirA;

    const cokM = Math.pow(1 + cokA, 1 / 12) - 1;
    const van = calcVAN(principal, cashflows, cokM);

    const monthlyPayment = schedule.find((r) => !r.isGrace)?.basePayment ?? 0;

    const simResults: SimResults = {
      monthlyPayment,
      tem,
      tcea,
      van,
      tirM,
      tirA,
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

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

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
  }, [
    annualRate,
    subsidyChoice,
    bonoTP.applies,
    bonoTP.bonus,
    bonoBBP.applies,
    bonoBBP.bonus,
    capPerYear,
    clients,
    cok,
    comisionActivacion,
    comisionEstudio,
    comisionPeriodica,
    costoNotarial,
    costoRegistral,
    desgravamen,
    gastosAdmin,
    gracePartialMonths,
    graceTotalMonths,
    properties,
    propInsurance,
    portesMensual,
    rateType,
    selectedClient,
    selectedEntity,
    selectedProperty,
    tasacion,
    termYears,
    userId,
    getUsdPenRate,
  ]);

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

              <Field label="Subsidio a aplicar">
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={subsidyChoice}
                    onChange={(e) =>
                      setSubsidyChoice(e.target.value as SubsidyChoice)
                    }
                    className={sel}
                  >
                    <option value="NONE">Ninguno</option>
                    <option value="TECHO_PROPIO">Techo Propio (BFH)</option>
                    <option value="BBP">
                      Bono del Buen Pagador (MiVivienda)
                    </option>
                  </select>
                </div>
              </Field>

              <Field label="Techo Propio">
                <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <div className="font-medium">
                    {bonoTP.applies
                      ? `${bonoTP.label} — S/ ${bonoTP.bonus.toLocaleString("es-PE")}`
                      : "No aplica"}
                  </div>
                  <div className="text-xs text-slate-500">{bonoTP.reason}</div>
                </div>
              </Field>

              <Field label="Bono del Buen Pagador (BBP)">
                <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <div className="font-medium">
                    {bonoBBP.applies
                      ? `${bonoBBP.label} — S/ ${bonoBBP.bonus.toLocaleString("es-PE")}`
                      : "No aplica"}
                  </div>
                  <div className="text-xs text-slate-500">{bonoBBP.reason}</div>
                </div>
              </Field>
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
                  <div className="max-h-[420px] overflow-y-auto px-4 py-3" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
