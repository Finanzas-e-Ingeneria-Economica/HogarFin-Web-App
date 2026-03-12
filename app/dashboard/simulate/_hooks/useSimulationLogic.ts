import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { calcTEM, calcTIR, calcVAN, generateSchedule } from "../_utils/finance";
import { calcBBP, calcTechoPropioAVN } from "../_utils/subsidies";
import type { Client, Entity, Property, SimResults } from "../_utils/types";
import type { BonoAuto, SubsidyChoice } from "../_utils/subsidies";

export function useSimulationLogic(
  userId: string | null,
  clients: Client[],
  properties: Property[],
  getUsdPenRate: () => Promise<number>
) {
  // 1. Estados del Formulario
  const [selectedClient, setSelectedClient] = useState<number | "">("");
  const [selectedProperty, setSelectedProperty] = useState<number | "">("");
  const [selectedEntity, setSelectedEntity] = useState<number | "">("");
  const [entities, setEntities] = useState<Entity[]>([]);

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

  const [bonoTP, setBonoTP] = useState<BonoAuto>({ applies: false, bonus: 0, label: "No aplica", reason: "Selecciona cliente e inmueble." });
  const [bonoBBP, setBonoBBP] = useState<BonoAuto>({ applies: false, bonus: 0, label: "No aplica", reason: "Selecciona inmueble." });

  // 2. Estados de la UI / Resultados
  const [results, setResults] = useState<SimResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Datos Derivados
  const propData = useMemo(() => properties.find((p) => p.id === selectedProperty), [properties, selectedProperty]);
  const entityData = useMemo(() => entities.find((e) => e.id === selectedEntity), [entities, selectedEntity]);
  const clientData = useMemo(() => clients.find((c) => c.id === selectedClient), [clients, selectedClient]);

  // 4. Lógica de Entidades Financieras
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
      supabase.from("rate_plans").select("rate_type, annual_rate, capitalization_per_year").eq("entity_id", entityId).eq("currency", "PEN").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("bank_conditions").select("desgravamen_monthly_rate, property_insurance_annual_rate, monthly_fees_fixed").eq("entity_id", entityId).eq("currency", "PEN").eq("is_active", true).maybeSingle(),
    ]);

    if (rp) {
      setRateType(rp.rate_type as "TEA" | "TNA");
      setAnnualRate((Number(rp.annual_rate) * 100).toFixed(4));
      setCapPerYear(Number(rp.capitalization_per_year) || 12);
    }
    if (bc) {
      setDesgravamen((Number(bc.desgravamen_monthly_rate) * 100).toFixed(4));
      setPropInsurance((Number(bc.property_insurance_annual_rate) * 100).toFixed(4));
      setPortesMensual(Number(bc.monthly_fees_fixed).toFixed(2));
    }
    setBankLoading(false);
    setBankLoaded(Boolean(rp || bc));
  }, []);

  const loadEligibleEntities = useCallback(async (pricePEN: number, termMonths: number) => {
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
      if (fe?.id && fe?.name) map.set(Number(fe.id), { id: Number(fe.id), name: String(fe.name) });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!propData) { if (alive) { setEntities([]); onEntityChange(""); } return; }
      const termMonths = termYears * 12;
      const fxRate = propData.currency === "USD" ? await getUsdPenRate() : 1;
      const pricePEN = propData.currency === "USD" ? propData.price * fxRate : propData.price;
      try {
        const list = await loadEligibleEntities(pricePEN, termMonths);
        if (!alive) return;
        setEntities(list);
        if (!list.some((e) => e.id === selectedEntity)) onEntityChange("");
      } catch {
        if (alive) { setEntities([]); onEntityChange(""); }
      }
    }
    run();
    return () => { alive = false; };
  }, [propData, termYears, getUsdPenRate, loadEligibleEntities, selectedEntity, onEntityChange]);

  // 5. Lógica de Bonos
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!propData) {
        if (alive) {
          setBonoTP({ applies: false, bonus: 0, label: "No aplica", reason: "Selecciona cliente e inmueble." });
          setBonoBBP({ applies: false, bonus: 0, label: "No aplica", reason: "Selecciona inmueble." });
        }
        return;
      }
      const fxRate = propData.currency === "USD" ? await getUsdPenRate() : 1;
      const pricePEN = propData.currency === "USD" ? propData.price * fxRate : propData.price;
      const initPEN = propData.currency === "USD" ? propData.initial_payment * fxRate : propData.initial_payment;

      if (!clientData) {
        if (alive) setBonoTP({ applies: false, bonus: 0, label: "No aplica", reason: "Selecciona cliente e inmueble." });
      } else {
        const rTP = calcTechoPropioAVN({ monthlyIncome: Number(clientData.monthly_income) || 0, dependents: Number(clientData.dependents) || 0, propertyType: String(propData.property_type || ""), pricePEN, initialPEN: initPEN });
        if (alive) setBonoTP(rTP);
      }
      const rBBP = calcBBP({ pricePEN, initialPEN: initPEN });
      if (alive) setBonoBBP(rBBP);
    }
    run();
    return () => { alive = false; };
  }, [clientData, propData, getUsdPenRate]);

  useEffect(() => {
    if ((subsidyChoice === "TECHO_PROPIO" && !bonoTP.applies) || (subsidyChoice === "BBP" && !bonoBBP.applies)) {
      setSubsidyChoice("NONE");
    }
  }, [subsidyChoice, bonoTP.applies, bonoBBP.applies]);

  // 6. Simulación
  const runSimulation = useCallback(async () => {
    setError(null); setSaved(false); setResults(null); setShowSchedule(false);
    if (!selectedClient) return setError("Selecciona un cliente.");
    if (!selectedProperty) return setError("Selecciona una propiedad.");
    if (!selectedEntity) return setError("Selecciona una entidad financiera.");
    if (!annualRate) return setError("La tasa de interés es obligatoria.");

    const prop = properties.find((p) => p.id === selectedProperty);
    const client = clients.find((c) => c.id === selectedClient);
    if (!prop || !client) return setError("Datos incompletos.");

    const rate = Number(annualRate) / 100;
    if (!Number.isFinite(rate) || rate <= 0) return setError("La tasa debe ser mayor a 0.");
    const cokA = Number(cok) / 100;
    if (!Number.isFinite(cokA) || cokA <= 0) return setError("El COK debe ser mayor a 0.");
    if (graceTotalMonths + gracePartialMonths > 6) return setError("Los meses de gracia no pueden superar los 6 meses.");
    
    const totalMonths = termYears * 12;
    const gT = Math.max(0, graceTotalMonths);
    const gP = Math.max(0, gracePartialMonths);
    if (gT + gP >= totalMonths) return setError("Los meses de gracia superan el plazo total.");

    setLoading(true);

    let fxRate = 1;
    let pricePEN = prop.price;
    let initPEN = prop.initial_payment;
    if (prop.currency === "USD") {
      fxRate = await getUsdPenRate();
      pricePEN = prop.price * fxRate;
      initPEN = prop.initial_payment * fxRate;
    }

    const bonusPEN = subsidyChoice === "TECHO_PROPIO" ? (bonoTP.applies ? bonoTP.bonus : 0) : subsidyChoice === "BBP" ? (bonoBBP.applies ? bonoBBP.bonus : 0) : 0;
    if (subsidyChoice === "TECHO_PROPIO" && !bonoTP.applies) { setLoading(false); return setError("Techo Propio no aplica."); }
    if (subsidyChoice === "BBP" && !bonoBBP.applies) { setLoading(false); return setError("BBP no aplica."); }

    const tem = calcTEM(rateType, rate, capPerYear);
    const desRate = (Number(desgravamen) || 0) / 100;
    const insRate = (Number(propInsurance) || 0) / 100;
    const portesM = Number(portesMensual) || 0;
    const portesTotal = portesM + (Number(comisionPeriodica) || 0) + (Number(gastosAdmin) || 0);
    const costoInicial = (Number(costoNotarial) || 0) + (Number(costoRegistral) || 0) + (Number(tasacion) || 0) + (Number(comisionEstudio) || 0) + (Number(comisionActivacion) || 0);
    const principalBase = pricePEN - initPEN - bonusPEN;
    const principal = principalBase + costoInicial;

    if (principal <= 0) { setLoading(false); return setError("Monto a financiar debe ser mayor a 0."); }

    const schedule = generateSchedule(principal, tem, totalMonths, gT, gP, desRate, insRate, pricePEN, portesTotal);
    const cashflows = schedule.map((r) => r.cashflow);
    const tirM = calcTIR(principal, cashflows);
    const tirA = tirM > 0 ? Math.pow(1 + tirM, 12) - 1 : -1;
    const cokM = Math.pow(1 + cokA, 1 / 12) - 1;
    const van = calcVAN(principal, cashflows, cokM);
    const monthlyPayment = schedule.find((r) => !r.isGrace)?.basePayment ?? 0;

    const simResults: SimResults = { monthlyPayment, tem, tcea: tirA, van, tirM, tirA, schedule, principal, annualRate: rate, rateType, currency: prop.currency, exchangeRateUsed: fxRate, principalPEN: principal };
    setResults(simResults);
    setLoading(false);

    try {
      const { data: rp } = await supabase.from("rate_plans").select("id").eq("entity_id", selectedEntity).eq("currency", "PEN").eq("rate_type", rateType).limit(1).maybeSingle();
      if (!rp) return;

      const { data: sim } = await supabase.from("loan_simulations").insert({
        user_id: userId, client_id: selectedClient, property_id: selectedProperty, entity_id: selectedEntity, rate_plan_id: rp.id, currency: "PEN", property_value: pricePEN, initial_payment: initPEN, bonus_amount: bonusPEN, principal, term_months: totalMonths, annual_rate_used: rate, rate_type_used: rateType, capitalization_per_year_used: capPerYear, monthly_rate: tem, monthly_payment: monthlyPayment, grace_type: gT > 0 ? "TOTAL" : gP > 0 ? "PARTIAL" : "NONE", grace_months: gT > 0 ? gT : gP, tcea: tirA > 0 ? tirA : null, van, tir: tirA > 0 ? tirA : null, desgravamen_monthly_rate_used: desRate, property_insurance_annual_rate_used: insRate, monthly_fees_fixed_used: portesTotal, upfront_costs_fixed_used: costoInicial, cok_monthly_used: cokM, exchange_rate_used: fxRate,
      }).select().single();

      if (sim) {
        await supabase.from("schedule_rows").insert(schedule.map((r) => ({ simulation_id: sim.id, n: r.period, payment: r.basePayment, interest: r.interest, amortization: r.amort, balance: r.balance, base_payment: r.basePayment, desgravamen: r.desgravamen, property_insurance: r.propertyInsurance, monthly_fees: r.monthlyFees, total_payment: r.totalPayment, cashflow: r.cashflow, is_grace_period: r.isGrace })));
        setSaved(true);
      }
    } catch (e) { console.error(e); }
  }, [
    annualRate, subsidyChoice, bonoTP.applies, bonoTP.bonus, bonoBBP.applies, bonoBBP.bonus, capPerYear, clients, cok, comisionActivacion, comisionEstudio, comisionPeriodica, costoNotarial, costoRegistral, desgravamen, gastosAdmin, gracePartialMonths, graceTotalMonths, properties, propInsurance, portesMensual, rateType, selectedClient, selectedEntity, selectedProperty, tasacion, termYears, userId, getUsdPenRate
  ]);

  return {
    // Retornamos todo lo que la vista necesita
    selectedClient, setSelectedClient, selectedProperty, setSelectedProperty, selectedEntity, onEntityChange, entities,
    termYears, setTermYears, rateType, setRateType, annualRate, setAnnualRate, capPerYear, setCapPerYear, desgravamen, setDesgravamen, propInsurance, setPropInsurance, portesMensual, setPortesMensual, graceTotalMonths, setGraceTotalMonths,
    costoNotarial, setCostoNotarial, costoRegistral, setCostoRegistral, tasacion, setTasacion, comisionEstudio, setComisionEstudio, comisionActivacion, setComisionActivacion, comisionPeriodica, setComisionPeriodica, gastosAdmin, setGastosAdmin,
    cok, setCok, gracePartialMonths, setGracePartialMonths, subsidyChoice, setSubsidyChoice, bonoTP, bonoBBP,
    bankLoading, bankLoaded, results, loading, saved, showSchedule, setShowSchedule, error, propData, entityData, clientData,
    runSimulation
  };
}