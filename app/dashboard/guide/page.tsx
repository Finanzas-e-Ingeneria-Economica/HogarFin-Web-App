"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BookOpen,
  BadgeCheck,
  Building2,
  Shield,
  Percent,
  Wallet,
  Search,
  Info,
  FileText,
} from "lucide-react";

type Entity = { id: number; name: string };

type BankCond = {
  entity_id: number;
  currency: "PEN" | "USD";
  desgravamen_monthly_rate: string | number | null;
  property_insurance_annual_rate: string | number | null;
  monthly_fees_fixed: string | number | null;
  upfront_costs_fixed: string | number | null;
  is_active: boolean;
};

type RatePlan = {
  entity_id: number;
  currency: "PEN" | "USD";
  rate_type: "TEA" | "TNA";
  annual_rate: string | number;
  capitalization_per_year: number;
  is_active: boolean;
  created_at: string;
};

type RateTier = {
  entity_id: number;
  currency: "PEN" | "USD";
  rate_type: "TEA" | "TNA";
  capitalization_per_year: number;
  min_property_value: string | number;
  max_property_value: string | number | null;
  min_term_months: number;
  max_term_months: number;
  tea_min: string | number;
  tea_max: string | number;
  is_active: boolean;
};

const pillBase =
  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition";

const card =
  "rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur";

const th =
  "whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50";
const td = "whitespace-nowrap px-3 py-2 text-sm text-slate-700";
const tdMuted = "whitespace-nowrap px-3 py-2 text-sm text-slate-500";

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number, digits = 4) => `${(v * 100).toFixed(digits)}%`;

const toNum = (x: unknown) => {
  const n = typeof x === "string" ? Number(x) : typeof x === "number" ? x : NaN;
  return Number.isFinite(n) ? n : null;
};

function rangeMoney(min: number, max: number | null) {
  const a = `S/ ${fmtMoney(min)}`;
  if (max === null) return `${a}+`;
  return `${a} — S/ ${fmtMoney(max)}`;
}

function rangeTerm(minM: number, maxM: number) {
  const minY = Math.round((minM / 12) * 10) / 10;
  const maxY = Math.round((maxM / 12) * 10) / 10;
  return `${minM}–${maxM} meses (${minY}–${maxY} años)`;
}

export default function GuidePage() {
  const [tab, setTab] = useState<"tp" | "banks">("tp");

  const [entities, setEntities] = useState<Entity[]>([]);
  const [conds, setConds] = useState<BankCond[]>([]);
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [tiers, setTiers] = useState<RateTier[]>([]);

  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
  const [price, setPrice] = useState<number>(300000);
  const [termYears, setTermYears] = useState<number>(20);
  const [q, setQ] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const termMonths = useMemo(() => Math.max(60, Math.min(300, termYears * 12)), [
    termYears,
  ]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const [
        { data: ents, error: e1 },
        { data: bc, error: e2 },
        { data: rp, error: e3 },
        { data: rt, error: e4 },
      ] = await Promise.all([
        supabase.from("financial_entities").select("id,name").order("name"),
        supabase
          .from("bank_conditions")
          .select(
            "entity_id,currency,desgravamen_monthly_rate,property_insurance_annual_rate,monthly_fees_fixed,upfront_costs_fixed,is_active",
          )
          .eq("is_active", true),
        supabase
          .from("rate_plans")
          .select(
            "entity_id,currency,rate_type,annual_rate,capitalization_per_year,is_active,created_at",
          )
          .eq("is_active", true),
        supabase
          .from("rate_tiers")
          .select(
            "entity_id,currency,rate_type,capitalization_per_year,min_property_value,max_property_value,min_term_months,max_term_months,tea_min,tea_max,is_active",
          )
          .eq("is_active", true),
      ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;

      setEntities((ents ?? []) as Entity[]);
      setConds((bc ?? []) as BankCond[]);
      setPlans((rp ?? []) as RatePlan[]);
      setTiers((rt ?? []) as RateTier[]);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando la guía.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const entityById = useMemo(() => {
    const m = new Map<number, string>();
    entities.forEach((e) => m.set(e.id, e.name));
    return m;
  }, [entities]);

  const planByEntityCurrency = useMemo(() => {
    const m = new Map<string, RatePlan>();
    const sorted = [...plans].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );
    for (const p of sorted) m.set(`${p.entity_id}-${p.currency}`, p);
    return m;
  }, [plans]);

  const applicableTiers = useMemo(() => {
    const priceN = Math.max(0, Number(price) || 0);
    const termM = termMonths;

    const rows = tiers
      .filter((t) => t.currency === currency)
      .filter((t) => {
        const minP = toNum(t.min_property_value) ?? 0;
        const maxP = toNum(t.max_property_value);
        const okPrice = minP <= priceN && (maxP === null || maxP >= priceN);
        const okTerm = t.min_term_months <= termM && t.max_term_months >= termM;
        return okPrice && okTerm;
      })
      .map((t) => {
        const name = entityById.get(t.entity_id) ?? `Entidad ${t.entity_id}`;
        const c = conds.find(
          (x) => x.entity_id === t.entity_id && x.currency === currency,
        );
        const p = planByEntityCurrency.get(`${t.entity_id}-${currency}`);

        const minP = toNum(t.min_property_value) ?? 0;
        const maxP = toNum(t.max_property_value);

        const teaMin = toNum(t.tea_min) ?? 0;
        const teaMax = toNum(t.tea_max) ?? 0;

        const des = toNum(c?.desgravamen_monthly_rate);
        const ins = toNum(c?.property_insurance_annual_rate);
        const monthlyFees = toNum(c?.monthly_fees_fixed);
        const upfront = toNum(c?.upfront_costs_fixed);

        return {
          key: `${t.entity_id}|${minP}|${maxP ?? "null"}|${t.min_term_months}|${t.max_term_months}|${teaMin}|${teaMax}`,
          entity_id: t.entity_id,
          entity: name,
          rangoPrecio: rangeMoney(minP, maxP),
          plazo: rangeTerm(t.min_term_months, t.max_term_months),
          tasa:
            teaMin === teaMax
              ? fmtPct(teaMin)
              : `${fmtPct(teaMin)} — ${fmtPct(teaMax)}`,
          rateType: t.rate_type,
          cap: t.capitalization_per_year,
          planRate:
            p?.annual_rate != null ? fmtPct(toNum(p.annual_rate) ?? 0) : null,
          planType: p?.rate_type ?? null,
          planCap: p?.capitalization_per_year ?? null,
          desgravamen: des != null ? fmtPct(des) : "—",
          seguroInm: ins != null ? fmtPct(ins) : "—",
          portes: monthlyFees != null ? `S/ ${monthlyFees.toFixed(2)}` : "—",
          upfront: upfront != null ? `S/ ${upfront.toFixed(2)}` : "—",
        };
      });

    const qn = q.trim().toLowerCase();
    const filtered = qn
      ? rows.filter((r) => r.entity.toLowerCase().includes(qn))
      : rows;

    return filtered.sort((a, b) => a.entity.localeCompare(b.entity));
  }, [tiers, currency, price, termMonths, q, entityById, conds, planByEntityCurrency]);

  const summaryRows = useMemo(() => {
    const qn = q.trim().toLowerCase();

    return entities
      .filter((e) => (qn ? e.name.toLowerCase().includes(qn) : true))
      .map((e) => {
        const c = conds.find((x) => x.entity_id === e.id && x.currency === currency);
        const p = planByEntityCurrency.get(`${e.id}-${currency}`);

        const des = toNum(c?.desgravamen_monthly_rate);
        const ins = toNum(c?.property_insurance_annual_rate);
        const monthlyFees = toNum(c?.monthly_fees_fixed);
        const upfront = toNum(c?.upfront_costs_fixed);

        return {
          id: e.id,
          name: e.name,
          plan:
            p?.annual_rate != null
              ? `${p.rate_type} ${fmtPct(toNum(p.annual_rate) ?? 0)} (cap ${p.capitalization_per_year}/año)`
              : "—",
          desgravamen: des != null ? fmtPct(des) : "—",
          seguroInm: ins != null ? fmtPct(ins) : "—",
          portes: monthlyFees != null ? `S/ ${monthlyFees.toFixed(2)}` : "—",
          upfront: upfront != null ? `S/ ${upfront.toFixed(2)}` : "—",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entities, conds, planByEntityCurrency, currency, q]);

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Guía</h1>
            <p className="mt-1 text-sm text-slate-500">
              Requisitos de Techo Propio y referencia de tasas, seguros y costos por entidad financiera.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("tp")}
              className={
                pillBase +
                " " +
                (tab === "tp"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              <BadgeCheck className="h-4 w-4" />
              Techo Propio
            </button>

            <button
              type="button"
              onClick={() => setTab("banks")}
              className={
                pillBase +
                " " +
                (tab === "banks"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              <Building2 className="h-4 w-4" />
              Tasas y costos
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Cargando…
          </div>
        )}

        {!loading && tab === "tp" && (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className={card + " lg:col-span-2"}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Requisitos y validaciones
                  </div>
                  <div className="text-xs text-slate-500">
                    Resumen de reglas usadas para determinar si el bono aplica.
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Validaciones previas
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    <li>El precio de la vivienda debe ser mayor a 0.</li>
                    <li>La cuota inicial no puede ser negativa.</li>
                    <li>Debe existir grupo familiar (dependientes ≥ 1).</li>
                    <li>El tipo de inmueble debe ser Casa o Departamento.</li>
                    <li>
                      El bono no puede hacer que el monto neto a financiar sea menor o igual a 0.
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">VIS Priorizada</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Aplica si el ingreso mensual del hogar es menor o igual a S/ 2,071.
                  </p>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-slate-200">
                      <thead>
                        <tr>
                          <th className={th}>Tipo</th>
                          <th className={th}>Precio máximo</th>
                          <th className={th}>Bono</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-200">
                          <td className={td}>Casa</td>
                          <td className={tdMuted}>S/ 60,000</td>
                          <td className={td}>S/ 58,300</td>
                        </tr>
                        <tr className="border-t border-slate-200">
                          <td className={td}>Departamento</td>
                          <td className={tdMuted}>S/ 70,000</td>
                          <td className={td}>S/ 53,350</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">VIS</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Aplica si el ingreso mensual del hogar es menor o igual a S/ 3,715.
                  </p>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-slate-200">
                      <thead>
                        <tr>
                          <th className={th}>Tipo</th>
                          <th className={th}>Precio máximo</th>
                          <th className={th}>Bono</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-200">
                          <td className={td}>Casa</td>
                          <td className={tdMuted}>S/ 109,000</td>
                          <td className={td}>S/ 52,250</td>
                        </tr>
                        <tr className="border-t border-slate-200">
                          <td className={td}>Departamento</td>
                          <td className={tdMuted}>S/ 136,000</td>
                          <td className={td}>S/ 47,850</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4" />
                    <div>
                      Este apartado tiene fines informativos y resume las reglas vigentes en el
                      simulador.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Notas de uso</div>
                  <div className="text-xs text-slate-500">Puntos importantes al evaluar simulaciones.</div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Cuota inicial</div>
                  <p className="mt-1 text-sm text-slate-600">
                    La cuota inicial deberá ser del 10% al 30% del precio de la vivienda.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Moneda</div>
                  <p className="mt-1 text-sm text-slate-600">
                    La evaluación del bono se realiza con el precio de la vivienda expresado en PEN.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Plazo</div>
                  <p className="mt-1 text-sm text-slate-600">
                    El simulador utiliza plazos entre 5 y 25 años (60 a 300 meses).
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Períodos de gracia</div>
                  <p className="mt-1 text-sm text-slate-600">
                    El total de meses de gracia (total + parcial) no puede exceder 6 meses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && tab === "banks" && (
          <div className="mt-5 space-y-5">
            <div className={card}>
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Tasas, seguros y costos por entidad
                    </div>
                    <div className="text-xs text-slate-500">
                      El filtro de precio y plazo muestra entidades que cuentan con un rango aplicable.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 sm:w-[120px]"
                  >
                    <option value="PEN">PEN</option>
                    <option value="USD">USD</option>
                  </select>

                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 sm:w-[150px]"
                    placeholder="Precio"
                  />

                  <input
                    type="number"
                    min={5}
                    max={25}
                    value={termYears}
                    onChange={(e) =>
                      setTermYears(Math.min(25, Math.max(5, Number(e.target.value) || 5)))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 sm:w-[120px]"
                    placeholder="Años"
                  />

                  <div className="relative w-full sm:w-[240px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                      placeholder="Buscar entidad..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  Precio: {currency === "PEN" ? `S/ ${fmtMoney(price)}` : `$ ${fmtMoney(price)}`} ·
                  Plazo: {termMonths} meses
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
                    <thead>
                      <tr>
                        <th className={th}>Entidad</th>
                        <th className={th}>Rango precio</th>
                        <th className={th}>Plazo</th>
                        <th className={th}>Tasa (rango)</th>
                        <th className={th}>Desgravamen (mensual)</th>
                        <th className={th}>Seguro inmueble (anual)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {applicableTiers.length === 0 ? (
                        <tr>
                          <td className={tdMuted} colSpan={8}>
                            No hay entidades con rango aplicable para el precio y plazo seleccionados.
                          </td>
                        </tr>
                      ) : (
                        applicableTiers.map((r) => (
                          <tr key={r.key} className="border-t border-slate-200">
                            <td className={td}>
                              <div className="font-medium text-slate-900">{r.entity}</div>
                              <div className="text-xs text-slate-500">
                                {r.rateType}
                                {typeof r.cap === "number" ? ` · cap ${r.cap}/año` : ""}
                                {r.planRate && r.planType ? ` · plan ${r.planType} ${r.planRate}` : ""}
                              </div>
                            </td>
                            <td className={tdMuted}>{r.rangoPrecio}</td>
                            <td className={tdMuted}>{r.plazo}</td>
                            <td className={td}>
                              <span className="font-semibold text-slate-900">{r.tasa}</span>
                            </td>
                            <td className={tdMuted}>{r.desgravamen}</td>
                            <td className={tdMuted}>{r.seguroInm}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}