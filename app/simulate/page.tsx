"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = { id: number; names: string; last_names: string };
type Property = {
  id: number;
  client_id: number;
  price: number;
  initial_payment: number;
  location: string;
  area_m2: number | null;
};
type RatePlanRow = {
  id: number;
  annual_rate: number;
  currency: "PEN" | "USD";
  rate_type: "TEA" | "TNA";
  capitalization_per_year: number;
  entity_id: number;
  financial_entities: { name: string } | null;
};

type ScheduleRow = {
  n: number;
  payment: number;
  interest: number;
  amortization: number;
  balance: number;
};

function toMonthlyRate(plan: RatePlanRow): number {
  const a = Number(plan.annual_rate);
  if (plan.rate_type === "TEA") {
    // TEA -> TEM
    return Math.pow(1 + a, 1 / 12) - 1;
  }

  // TNA con capitalización m:
  // i_eff_anual = (1 + (TNA/m))^m - 1
  // i_mes = (1 + i_eff_anual)^(1/12) - 1
  const m = Number(plan.capitalization_per_year);
  const effAnnual = Math.pow(1 + a / m, m) - 1;
  return Math.pow(1 + effAnnual, 1 / 12) - 1;
}

function paymentFrench(balance: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (r === 0) return balance / n;
  return (balance * r) / (1 - Math.pow(1 + r, -n));
}

function irrMonthly(cashflows: number[]): number | null {
  // cashflows[0] usually positive (loan disbursement), rest negative (payments)
  // We'll use bisection in a reasonable range.
  const npv = (rate: number) => {
    let v = 0;
    for (let t = 0; t < cashflows.length; t++) {
      v += cashflows[t] / Math.pow(1 + rate, t);
    }
    return v;
  };

  let lo = -0.9; // can't be -1
  let hi = 2.0;  // 200% monthly cap (more than enough)
  let fLo = npv(lo);
  let fHi = npv(hi);

  if (Number.isNaN(fLo) || Number.isNaN(fHi)) return null;
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;

  // Need opposite signs
  if (fLo * fHi > 0) return null;

  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-10) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

function npvAtRate(cashflows: number[], rate: number): number {
  let v = 0;
  for (let t = 0; t < cashflows.length; t++) {
    v += cashflows[t] / Math.pow(1 + rate, t);
  }
  return v;
}

export default function SimulatePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlanRow[]>([]);

  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [ratePlanId, setRatePlanId] = useState("");

  const [termMonths, setTermMonths] = useState("240"); // 20 años default
  const [graceType, setGraceType] = useState<"NONE" | "TOTAL" | "PARTIAL">("NONE");
  const [graceMonths, setGraceMonths] = useState("0");

  const [applyBonus, setApplyBonus] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("0");

  const [msg, setMsg] = useState<string | null>(null);

  const [preview, setPreview] = useState<{
    currency: string;
    rateType: string;
    cap: number;
    tem: number;
    principal: number;
    payment: number;
    van: number;
    tirAnnual: number | null;
    tcea: number | null;
    schedule: ScheduleRow[];
  } | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === Number(clientId)) ?? null,
    [clients, clientId]
  );

  const filteredProperties = useMemo(() => {
    const cid = Number(clientId);
    if (!cid) return [];
    return properties.filter((p) => p.client_id === cid);
  }, [properties, clientId]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === Number(propertyId)) ?? null,
    [properties, propertyId]
  );

  const selectedPlan = useMemo(
    () => ratePlans.find((p) => p.id === Number(ratePlanId)) ?? null,
    [ratePlans, ratePlanId]
  );

  const loadAll = async () => {
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const uid = userData.user.id;
    setUserId(uid);

    const { data: cData, error: cErr } = await supabase
      .from("clients")
      .select("id,names,last_names")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (cErr) setMsg(cErr.message);

    const { data: pData, error: pErr } = await supabase
      .from("properties")
      .select("id,client_id,price,initial_payment,location,area_m2")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (pErr) setMsg(pErr.message);

    const { data: rpData, error: rpErr } = await supabase
      .from("rate_plans")
      .select("id,annual_rate,currency,rate_type,capitalization_per_year,entity_id,financial_entities(name)")
      .eq("is_active", true);

    if (rpErr) setMsg(rpErr.message);

    setClients((cData as Client[]) ?? []);
    setProperties((pData as Property[]) ?? []);
    setRatePlans((rpData as RatePlanRow[]) ?? []);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset property when client changes
  useEffect(() => {
    setPropertyId("");
  }, [clientId]);

  const logOp = async (action: string, refId?: number) => {
    if (!userId) return;
    await supabase.from("operation_logs").insert({
      user_id: userId,
      action,
      ref_table: "loan_simulations",
      ref_id: refId ?? null,
    });
  };

  const buildScheduleAndIndicators = () => {
    setMsg(null);
    setPreview(null);

    if (!selectedClient) return setMsg("Selecciona un cliente.");
    if (!selectedProperty) return setMsg("Selecciona una propiedad.");
    if (!selectedPlan) return setMsg("Selecciona un plan de tasa (entidad).");

    const n = Number(termMonths);
    const g = Number(graceMonths);
    const bonus = applyBonus ? Number(bonusAmount) : 0;

    if (!Number.isFinite(n) || n <= 0 || n > 480) return setMsg("Plazo inválido (1 a 480 meses).");
    if (!Number.isFinite(g) || g < 0 || g > n) return setMsg("Meses de gracia inválidos.");
    if (!Number.isFinite(bonus) || bonus < 0) return setMsg("Bono inválido.");

    const price = Number(selectedProperty.price);
    const initial = Number(selectedProperty.initial_payment);

    const principal = price - initial - bonus;
    if (!(principal > 0)) return setMsg("El monto financiado (precio - inicial - bono) debe ser > 0.");

    const r = toMonthlyRate(selectedPlan);
    const remaining = n - g;

    // saldo va cambiando con gracia
    let balance = principal;
    const schedule: ScheduleRow[] = [];

    // 1) meses de gracia
    for (let i = 1; i <= g; i++) {
      const interest = balance * r;
      if (graceType === "TOTAL") {
        // no paga, interés se capitaliza
        schedule.push({
          n: i,
          payment: 0,
          interest,
          amortization: 0,
          balance: balance + interest,
        });
        balance = balance + interest;
      } else if (graceType === "PARTIAL") {
        // paga solo interés, saldo no baja
        schedule.push({
          n: i,
          payment: interest,
          interest,
          amortization: 0,
          balance: balance,
        });
      } else {
        // NONE: si g>0 pero seleccionó NONE, lo tratamos como 0 gracia real
        schedule.push({
          n: i,
          payment: 0,
          interest: 0,
          amortization: 0,
          balance: balance,
        });
      }
    }

    // 2) calcular cuota francesa para meses restantes
    const cuota = paymentFrench(balance, r, remaining);

    // 3) meses normales
    for (let k = 1; k <= remaining; k++) {
      const idx = g + k;
      const interest = balance * r;
      const amort = Math.max(0, cuota - interest);
      const newBalance = Math.max(0, balance - amort);

      schedule.push({
        n: idx,
        payment: cuota,
        interest,
        amortization: amort,
        balance: newBalance,
      });

      balance = newBalance;
    }

    // cashflows para VAN/TIR desde perspectiva del cliente:
    // t0: +principal (recibe el préstamo)
    // t>=1: -pago
    const cashflows = [principal, ...schedule.map((s) => -s.payment)];

    const van = npvAtRate(cashflows, r); // VAN usando TEM como tasa de descuento (defendible)
    const irrM = irrMonthly(cashflows);
    const tirAnnual = irrM === null ? null : Math.pow(1 + irrM, 12) - 1;
    const tcea = tirAnnual; // en este MVP (sin comisiones), TCEA ≈ TIR anual efectiva

    setPreview({
      currency: selectedPlan.currency,
      rateType: selectedPlan.rate_type,
      cap: selectedPlan.capitalization_per_year,
      tem: r,
      principal,
      payment: cuota,
      van,
      tirAnnual,
      tcea,
      schedule,
    });
  };

  const saveSimulation = async () => {
    setMsg(null);
    if (!userId) return setMsg("No hay sesión.");
    if (!preview || !selectedPlan || !selectedProperty || !selectedClient) {
      return setMsg("Primero calcula la simulación.");
    }

    const n = Number(termMonths);
    const g = Number(graceMonths);
    const bonus = applyBonus ? Number(bonusAmount) : 0;

    // 1) insertar loan_simulations
    const { data: sim, error: simErr } = await supabase
      .from("loan_simulations")
      .insert({
        user_id: userId,
        client_id: selectedClient.id,
        property_id: selectedProperty.id,
        rate_plan_id: selectedPlan.id,
        term_months: n,
        principal: preview.principal,
        monthly_rate: preview.tem,
        monthly_payment: preview.payment,
        van: preview.van,
        tir: preview.tirAnnual,
        tcea: preview.tcea,

        // columnas nuevas (si ejecutaste el ALTER)
        currency: preview.currency,
        rate_type: preview.rateType,
        capitalization_per_year: preview.cap,
        grace_type: graceType,
        grace_months: g,
        bonus_amount: bonus,
      })
      .select("id")
      .single();

    if (simErr) return setMsg(simErr.message);

    const simId = sim.id as number;

    // 2) bulk insert schedule_rows
    const rows = preview.schedule.map((s) => ({
      simulation_id: simId,
      n: s.n,
      payment: s.payment,
      interest: s.interest,
      amortization: s.amortization,
      balance: s.balance,
    }));

    // Insert en chunks por si hay límite
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: rowErr } = await supabase.from("schedule_rows").insert(chunk);
      if (rowErr) return setMsg(rowErr.message);
    }

    await logOp("RUN_SIMULATION", simId);
    setMsg("✅ Simulación guardada.");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Simulación de Crédito</h1>
        <Link className="underline" href="/dashboard">Volver al dashboard</Link>
      </div>

      <div className="border rounded-xl p-4 space-y-4 max-w-4xl">
        <h2 className="text-lg font-semibold">Configuración</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm">Cliente</label>
            <select className="w-full border rounded-lg p-2" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Seleccionar</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names} {c.last_names}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Propiedad (del cliente)</label>
            <select className="w-full border rounded-lg p-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Seleccionar</option>
              {filteredProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.location} | Precio {Number(p.price).toFixed(2)} | Inicial {Number(p.initial_payment).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">Entidad financiera + plan de tasa</label>
            <select className="w-full border rounded-lg p-2" value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              <option value="">Seleccionar</option>
              {ratePlans.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {(rp.financial_entities?.name ?? "Entidad")} | {rp.currency} | {rp.rate_type} {Number(rp.annual_rate * 100).toFixed(3)}% | cap {rp.capitalization_per_year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Plazo (meses)</label>
            <input className="w-full border rounded-lg p-2" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Tipo de gracia</label>
            <select className="w-full border rounded-lg p-2" value={graceType} onChange={(e) => setGraceType(e.target.value as any)}>
              <option value="NONE">Sin gracia</option>
              <option value="TOTAL">Gracia total</option>
              <option value="PARTIAL">Gracia parcial</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Meses de gracia</label>
            <input className="w-full border rounded-lg p-2" value={graceMonths} onChange={(e) => setGraceMonths(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2 flex items-center gap-3">
            <input type="checkbox" checked={applyBonus} onChange={(e) => setApplyBonus(e.target.checked)} />
            <span className="text-sm">Aplicar bono (Techo Propio)</span>
            <input
              className="border rounded-lg p-2 flex-1"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              disabled={!applyBonus}
              placeholder="Monto del bono"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={buildScheduleAndIndicators} className="bg-black text-white rounded-lg px-4 py-2">
            Calcular simulación
          </button>
          <button onClick={saveSimulation} className="border rounded-lg px-4 py-2" disabled={!preview}>
            Guardar simulación
          </button>
        </div>

        {msg && <p className="text-sm">{msg}</p>}
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="border rounded-xl p-4 max-w-4xl space-y-2">
            <h2 className="text-lg font-semibold">Resultados</h2>
            <p className="text-sm">
              Moneda: <b>{preview.currency}</b> | Tasa: <b>{preview.rateType}</b> (cap {preview.cap}) | TEM: <b>{(preview.tem * 100).toFixed(6)}%</b>
            </p>
            <p className="text-sm">
              Monto financiado (PV - inicial - bono): <b>{preview.principal.toFixed(2)}</b>
            </p>
            <p className="text-sm">
              Cuota francesa (meses post-gracia): <b>{preview.payment.toFixed(2)}</b>
            </p>
            <p className="text-sm">
              VAN (con TEM): <b>{preview.van.toFixed(2)}</b>
            </p>
            <p className="text-sm">
              TIR anual efectiva: <b>{preview.tirAnnual === null ? "No calculable" : (preview.tirAnnual * 100).toFixed(6) + "%"}</b>
            </p>
            <p className="text-sm">
              TCEA anual efectiva: <b>{preview.tcea === null ? "No calculable" : (preview.tcea * 100).toFixed(6) + "%"}</b>
            </p>
          </div>

          <div className="border rounded-xl overflow-hidden max-w-5xl">
            <div className="p-3 font-semibold">Cronograma (método francés vencido, mensual)</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">N</th>
                    <th className="text-left p-2">Pago</th>
                    <th className="text-left p-2">Interés</th>
                    <th className="text-left p-2">Amort.</th>
                    <th className="text-left p-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.schedule.slice(0, 60).map((r) => (
                    <tr key={r.n} className="border-t">
                      <td className="p-2">{r.n}</td>
                      <td className="p-2">{r.payment.toFixed(2)}</td>
                      <td className="p-2">{r.interest.toFixed(2)}</td>
                      <td className="p-2">{r.amortization.toFixed(2)}</td>
                      <td className="p-2">{r.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 text-xs text-gray-600">
              Mostrando primeras 60 cuotas en pantalla (igual se guarda completo en BD).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}