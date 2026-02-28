"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Entity = {
  id: string;
  name: string;
};

type RateTier = {
  tea_min: number;
  tea_max: number;
  capitalization_per_year: number;
};

type BankConditions = {
  desgravamen_monthly_rate: number;
  property_insurance_annual_rate: number;
  monthly_fees_fixed: number;
  upfront_costs_fixed: number;
};

export default function SimulatePage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");

  const [propertyValue, setPropertyValue] = useState(0);
  const [initialPayment, setInitialPayment] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);

  const [termYears, setTermYears] = useState(20);
  const [graceType, setGraceType] = useState<"NONE" | "TOTAL" | "PARTIAL">("NONE");
  const [graceMonths, setGraceMonths] = useState(0);

  const [rate, setRate] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    loadEntities();
  }, []);

  async function loadEntities() {
    const { data } = await supabase
      .from("financial_entities")
      .select("id,name")
      .order("name");

    if (data) setEntities(data);
  }

  async function runSimulation() {
    if (!selectedEntity) return alert("Selecciona banco");

    let propertyValueForTier = propertyValue;
    let exchangeRateUsed = 1;

    if (currency === "USD") {
      const { data: fx } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("base_currency", "USD")
        .eq("target_currency", "PEN")
        .single();

      if (!fx) return alert("No hay tipo de cambio configurado");

      exchangeRateUsed = fx.rate;
      propertyValueForTier = propertyValue * fx.rate;
    }

    const { data: tier } = await supabase
      .from("rate_tiers")
      .select("tea_min,tea_max,capitalization_per_year")
      .eq("entity_id", selectedEntity)
      .eq("currency", "PEN")
      .lte("min_property_value", propertyValueForTier)
      .or(`max_property_value.is.null,max_property_value.gte.${propertyValueForTier}`)
      .single();

    if (!tier) return alert("No se encontró tasa");

    const annualRate = (tier.tea_min + tier.tea_max) / 2;
    setRate(annualRate);

    const { data: conditions } = await supabase
      .from("bank_conditions")
      .select("*")
      .eq("entity_id", selectedEntity)
      .eq("currency", "PEN")
      .single();

    if (!conditions) return alert("No hay condiciones bancarias");

    const principal = propertyValue - initialPayment - bonusAmount;
    const n = termYears * 12;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    let balance = principal;
    let rows: any[] = [];

    const basePayment =
      (principal * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -n));

    for (let i = 1; i <= n; i++) {
      let interest = balance * monthlyRate;
      let amort = 0;
      let payment = basePayment;

      if (graceType === "TOTAL" && i <= graceMonths) {
        payment = 0;
        amort = 0;
        balance += interest;
      } else if (graceType === "PARTIAL" && i <= graceMonths) {
        payment = interest;
        amort = 0;
      } else {
        amort = payment - interest;
        balance -= amort;
      }

      const desgravamen = balance * conditions.desgravamen_monthly_rate;
      const propertyInsurance =
        (propertyValue *
          conditions.property_insurance_annual_rate) /
        12;

      const total =
        payment +
        desgravamen +
        propertyInsurance +
        conditions.monthly_fees_fixed;

      rows.push({
        period: i,
        balance,
        interest,
        amort,
        payment,
        desgravamen,
        propertyInsurance,
        total,
        cashflow: -total,
      });
    }

    setMonthlyPayment(basePayment);
    setSchedule(rows);

    const { data: user } = await supabase.auth.getUser();

    const { data: sim } = await supabase
      .from("loan_simulations")
      .insert({
        user_id: user.user?.id,
        entity_id: selectedEntity,
        currency,
        property_value: propertyValue,
        initial_payment: initialPayment,
        bonus_amount: bonusAmount,
        principal,
        term_months: n,
        annual_rate_used: annualRate,
        monthly_rate: monthlyRate,
        monthly_payment: basePayment,
        grace_type: graceType,
        grace_months: graceMonths,
        desgravamen_monthly_rate_used:
          conditions.desgravamen_monthly_rate,
        property_insurance_annual_rate_used:
          conditions.property_insurance_annual_rate,
        monthly_fees_fixed_used:
          conditions.monthly_fees_fixed,
        upfront_costs_fixed_used:
          conditions.upfront_costs_fixed,
        exchange_rate_used: exchangeRateUsed,
      })
      .select()
      .single();

    if (sim) {
      await supabase.from("schedule_rows").insert(
        rows.map((r) => ({
          simulation_id: sim.id,
          period_number: r.period,
          balance: r.balance,
          interest: r.interest,
          amortization: r.amort,
          base_payment: r.payment,
          desgravamen: r.desgravamen,
          property_insurance: r.propertyInsurance,
          total_payment: r.total,
          cashflow: r.cashflow,
        }))
      );
    }

    alert("Simulación guardada");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Nueva Simulación</h1>

      <select onChange={(e) => setSelectedEntity(e.target.value)}>
        <option value="">Selecciona Banco</option>
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>

      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as any)}
      >
        <option value="PEN">PEN</option>
        <option value="USD">USD</option>
      </select>

      <input
        type="number"
        placeholder="Valor Inmueble"
        onChange={(e) => setPropertyValue(+e.target.value)}
      />

      <input
        type="number"
        placeholder="Inicial"
        onChange={(e) => setInitialPayment(+e.target.value)}
      />

      <input
        type="number"
        placeholder="Bono"
        onChange={(e) => setBonusAmount(+e.target.value)}
      />

      <input
        type="number"
        placeholder="Plazo (años)"
        value={termYears}
        onChange={(e) => setTermYears(+e.target.value)}
      />

      <button onClick={runSimulation}>
        Calcular y Guardar
      </button>

      {monthlyPayment > 0 && (
        <div>
          <h3>Cuota Base: {monthlyPayment.toFixed(2)}</h3>
          <h4>Tasa Anual: {(rate * 100).toFixed(2)}%</h4>
        </div>
      )}
    </div>
  );
}