"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GitCompare, X, Trophy, TrendingUp, BarChart3, AlertCircle } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type SimOption = { id: number; label: string; property: string; created_at: string };

type SimData = {
  id: number; bank: string; client: string; property: string;
  principal: number; monthly_payment: number; monthly_rate: number;
  tcea: number | null; van: number | null; tir: number | null;
  term_months: number; annual_rate_used: number; rate_type_used: string;
  cok_monthly_used: number | null;
  schedule: { n: number; balance: number; interest: number; amortization: number; total_payment: number }[];
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmtS  = (v: number) => `S/ ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
const fmtP  = (v: number) => `${(v * 100).toFixed(4)}%`;
const fmtPs = (v: number) => `${(v * 100).toFixed(2)}%`;

const COLORS       = ["#16a34a", "#2563eb", "#9333ea"];
const LIGHT_COLORS = ["#dcfce7", "#dbeafe", "#f3e8ff"];
const BORDER_CLS   = ["border-green-300",  "border-blue-300",  "border-purple-300"];
const TEXT_CLS     = ["text-green-700",    "text-blue-700",    "text-purple-700"];
const BG_CLS       = ["bg-green-50",       "bg-blue-50",       "bg-purple-50"];
const BADGE_CLS    = [
  "bg-green-100  text-green-800  ring-green-200",
  "bg-blue-100   text-blue-800   ring-blue-200",
  "bg-purple-100 text-purple-800 ring-purple-200",
];
const DOT_CLS = ["bg-green-600", "bg-blue-600", "bg-purple-600"];

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
export default function ComparadorPage() {
  const [simOptions,   setSimOptions]   = useState<SimOption[]>([]);
  const [numToCompare, setNumToCompare] = useState<number | null>(null);
  const [selectedIds,  setSelectedIds]  = useState<(number | "")[]>([]);
  const [simsData,     setSimsData]     = useState<SimData[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [chartType,    setChartType]    = useState<"balance" | "composicion">("balance");

  useEffect(() => { loadOptions(); }, []);

  async function loadOptions() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("loan_simulations")
      .select("id,created_at,clients(names,last_names),properties(name),financial_entities(name)")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setSimOptions((data as any[]).map(s => ({
        id: s.id,
        label: `#${s.id} · ${s.financial_entities?.name ?? "—"} · ${s.clients?.names ?? ""} ${s.clients?.last_names ?? ""}`,
        property: s.properties?.name ?? "—",
        created_at: s.created_at,
      })));
    }
  }

  function initCompare(n: number) {
    setNumToCompare(n);
    setSelectedIds(Array(n).fill(""));
    setSimsData([]);
    setError(null);
  }

  function updateSelected(idx: number, val: number | "") {
    setSelectedIds(prev => { const a = [...prev]; a[idx] = val; return a; });
    setSimsData([]);
  }

  async function runCompare() {
    const ids = selectedIds.filter(id => id !== "") as number[];
    if (ids.length < 2) return setError("Seleccioná al menos 2 simulaciones.");
    if (new Set(ids).size !== ids.length) return setError("No podés comparar la misma simulación dos veces.");
    setError(null);
    setLoading(true);
    const results: SimData[] = [];

    for (const id of ids) {
      const [{ data: sim }, { data: rows }] = await Promise.all([
        supabase.from("loan_simulations")
          .select("id,principal,monthly_payment,monthly_rate,tcea,van,tir,term_months,annual_rate_used,rate_type_used,cok_monthly_used,clients(names,last_names),properties(name),financial_entities(name)")
          .eq("id", id).single(),
        supabase.from("schedule_rows")
          .select("n,balance,interest,amortization,total_payment")
          .eq("simulation_id", id).order("n"),
      ]);

      if (sim) {
        const s = sim as any;
        results.push({
          id: s.id, bank: s.financial_entities?.name ?? "—",
          client: `${s.clients?.names ?? ""} ${s.clients?.last_names ?? ""}`.trim(),
          property: s.properties?.name ?? "—",
          principal: s.principal, monthly_payment: s.monthly_payment,
          monthly_rate: s.monthly_rate, tcea: s.tcea, van: s.van, tir: s.tir,
          term_months: s.term_months, annual_rate_used: s.annual_rate_used,
          rate_type_used: s.rate_type_used, cok_monthly_used: s.cok_monthly_used,
          schedule: rows ?? [],
        });
      }
    }
    setSimsData(results);
    setLoading(false);
  }

  // ── Métricas ──
  const totalInteres  = (s: SimData) => s.schedule.reduce((t, r) => t + (r.interest ?? 0), 0);
  const totalPagado   = (s: SimData) => s.schedule.reduce((t, r) => t + (r.total_payment ?? 0), 0);
  const costoTotal    = (s: SimData) => totalPagado(s) - s.principal;
  const cuotaPromedio = (s: SimData) => s.schedule.length ? totalPagado(s) / s.schedule.length : 0;

  function bestIdx(vals: number[], higher: boolean) {
    return vals.reduce((bi, v, i, a) => higher ? (v > a[bi] ? i : bi) : (v < a[bi] ? i : bi), 0);
  }

  function chartData(type: "balance" | "composicion") {
    if (!simsData.length) return [];
    const maxLen = Math.max(...simsData.map(s => s.schedule.length));
    const step = Math.max(1, Math.floor(maxLen / 60));
    return Array.from({ length: Math.ceil(maxLen / step) }, (_, i) => {
      const idx = i * step;
      const point: any = { periodo: idx + 1 };
      simsData.forEach((sim, si) => {
        const row = sim.schedule[idx];
        if (type === "balance") {
          point[`saldo_${si}`] = row ? Math.round(row.balance) : null;
        } else {
          point[`interes_${si}`] = row ? Math.round(row.interest) : null;
          point[`amort_${si}`]   = row ? Math.round(row.amortization) : null;
        }
      });
      return point;
    });
  }

  const indicators = simsData.length >= 2 ? [
    { label: "Cuota promedio mensual",  vals: simsData.map(cuotaPromedio),                                  fmt: fmtS,  best: "lower",  note: "Más baja es mejor" },
    { label: "Interés total pagado",    vals: simsData.map(totalInteres),                                   fmt: fmtS,  best: "lower",  note: "Menos es mejor" },
    { label: "Costo total del crédito", vals: simsData.map(costoTotal),                                     fmt: fmtS,  best: "lower",  note: "Menos es mejor" },
    { label: "TCEA anual",              vals: simsData.map(s => s.tcea ?? 0),                               fmt: fmtPs, best: "lower",  note: "Más baja es mejor" },
    { label: "VAN",                     vals: simsData.map(s => s.van ?? 0),                                fmt: fmtS,  best: "higher", note: "Más alto es mejor" },
    { label: "TIR mensual",             vals: simsData.map(s => s.tir ? Math.pow(1 + s.tir, 1 / 12) - 1 : 0), fmt: fmtP, best: "higher", note: "Más alta es mejor" },
    { label: "COK mensual usado",       vals: simsData.map(s => s.cok_monthly_used ?? 0),                   fmt: fmtP,  best: null,     note: "Referencia" },
  ] : [];

  const bestSimIdx = simsData.length >= 2
    ? simsData.map(s => s.tcea ?? Infinity).reduce((bi, v, i, a) => v < a[bi] ? i : bi, 0)
    : -1;

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-10 pt-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Comparador de Simulaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compará hasta 3 simulaciones del historial para elegir la mejor opción.
          </p>
        </div>

        {/* PASO 1 — ¿Cuántas? */}
        {!numToCompare && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-10 text-center">
            <GitCompare className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              ¿Cuántas simulaciones querés comparar?
            </h2>
            <p className="text-sm text-slate-500 mb-8">Podés comparar 2 o 3 simulaciones a la vez.</p>
            <div className="flex justify-center gap-6">
              {[2, 3].map(n => (
                <button key={n} onClick={() => initCompare(n)}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-10 py-7 hover:border-green-400 hover:bg-green-50 transition group shadow-sm">
                  <span className="text-5xl font-bold text-slate-200 group-hover:text-green-500 transition">{n}</span>
                  <span className="text-sm font-medium text-slate-500 group-hover:text-green-700">
                    {n === 2 ? "dos" : "tres"} simulaciones
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2 — Selectores */}
        {numToCompare && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-700">
                  <GitCompare className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  Seleccioná {numToCompare} simulaciones
                </span>
              </div>
              <button onClick={() => { setNumToCompare(null); setSimsData([]); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">
                <X className="h-3.5 w-3.5" /> Cambiar cantidad
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className={`grid gap-4 ${numToCompare === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                {Array.from({ length: numToCompare }).map((_, idx) => (
                  <div key={idx}>
                    <div className={`mb-1.5 flex items-center gap-2 text-xs font-semibold ${TEXT_CLS[idx]}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white ${DOT_CLS[idx]}`}>
                        {idx + 1}
                      </span>
                      Simulación {idx + 1}
                    </div>
                    <select
                      value={selectedIds[idx] ?? ""}
                      onChange={e => updateSelected(idx, Number(e.target.value) || "")}
                      className={`w-full rounded-xl border-2 bg-white px-3 py-2.5 text-sm outline-none transition cursor-pointer
                        ${selectedIds[idx] ? BORDER_CLS[idx] : "border-slate-200"} focus:ring-2 focus:ring-green-100`}
                    >
                      <option value="">— Elige una simulación —</option>
                      {simOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                    {selectedIds[idx] !== "" && (() => {
                      const opt = simOptions.find(s => s.id === selectedIds[idx]);
                      return opt ? (
                        <div className={`mt-1.5 rounded-lg ${BG_CLS[idx]} px-2.5 py-1.5 text-xs text-slate-600`}>
                          {opt.property} · {new Date(opt.created_at).toLocaleDateString("es-PE")}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={runCompare} disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50">
                  <GitCompare className="h-4 w-4" />
                  {loading ? "Cargando..." : "Comparar ahora"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESULTADOS */}
        {simsData.length >= 2 && (
          <div className="space-y-6">

            {/* Cabeceras de cada sim */}
            <div className={`grid gap-4 ${simsData.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {simsData.map((sim, idx) => (
                <div key={sim.id} className={`rounded-2xl border-2 ${BORDER_CLS[idx]} ${BG_CLS[idx]} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${DOT_CLS[idx]}`}>
                      {idx + 1}
                    </span>
                    <span className={`text-sm font-bold ${TEXT_CLS[idx]}`}>{sim.bank}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div className="font-medium text-slate-800">{sim.client}</div>
                    <div>{sim.property}</div>
                    <div>{sim.rate_type_used} {((sim.annual_rate_used ?? 0) * 100).toFixed(2)}% · {sim.term_months / 12} años</div>
                    <div className="mt-1 text-base font-bold text-slate-900">{fmtS(sim.principal)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla de indicadores */}
            <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                <BarChart3 className="h-4 w-4 text-green-700" />
                <span className="text-sm font-semibold text-slate-800">Comparativa de Indicadores</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 w-52">Indicador</th>
                      {simsData.map((sim, idx) => (
                        <th key={sim.id} className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 text-xs font-semibold ${BADGE_CLS[idx]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLS[idx]}`} />
                            {sim.bank}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Criterio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicators.map((ind, ri) => {
                      const bi = ind.best ? bestIdx(ind.vals, ind.best === "higher") : -1;
                      return (
                        <tr key={ri} className={`border-t border-slate-100 ${ri % 2 ? "bg-slate-50/40" : ""}`}>
                          <td className="px-5 py-3 text-xs font-medium text-slate-700">{ind.label}</td>
                          {ind.vals.map((val, idx) => (
                            <td key={idx} className="px-4 py-3 text-center">
                              <span className={`text-sm font-bold block ${bi === idx ? TEXT_CLS[idx] : "text-slate-800"}`}>
                                {ind.fmt(val)}
                              </span>
                              {bi === idx && ind.best && (
                                <span className={`inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-semibold ${TEXT_CLS[idx]}`}>
                                  <Trophy className="h-3 w-3" /> Mejor
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-xs text-slate-400">{ind.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráficos */}
            <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-700" />
                  <span className="text-sm font-semibold text-slate-800">Gráfico del Cronograma</span>
                </div>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  {(["balance", "composicion"] as const).map(t => (
                    <button key={t} onClick={() => setChartType(t)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${chartType === t ? "bg-green-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                      {t === "balance" ? "Saldo deudor" : "Composición cuota"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-5">
                {chartType === "balance" ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData("balance")} margin={{ top: 5, right: 10, left: 0, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 10 }}
                        label={{ value: "Período (meses)", position: "insideBottom", offset: -8, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmtS(v)} labelFormatter={l => `Período ${l}`} />
                      <Legend verticalAlign="top" height={36} />
                      {simsData.map((sim, idx) => (
                        <Area key={sim.id} type="monotone" dataKey={`saldo_${idx}`}
                          name={sim.bank} stroke={COLORS[idx]} fill={LIGHT_COLORS[idx]}
                          strokeWidth={2} dot={false} connectNulls />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData("composicion")} margin={{ top: 5, right: 10, left: 0, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 10 }}
                        label={{ value: "Período (meses)", position: "insideBottom", offset: -8, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmtS(v)} labelFormatter={l => `Período ${l}`} />
                      <Legend verticalAlign="top" height={36} />
                      {simsData.map((sim, idx) => (
                        <React.Fragment key={sim.id}>
                          <Line key={`i${sim.id}`} type="monotone" dataKey={`interes_${idx}`}
                            name={`${sim.bank} - Interés`} stroke={COLORS[idx]}
                            strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
                          <Line key={`a${sim.id}`} type="monotone" dataKey={`amort_${idx}`}
                            name={`${sim.bank} - Amort.`} stroke={COLORS[idx]}
                            strokeWidth={2.5} dot={false} connectNulls />
                       = </React.Fragment>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <p className="mt-1 text-center text-xs text-slate-400">
                  Los datos se muestrean para mejor visualización.
                </p>
              </div>
            </div>

            {/* Recomendación */}
            {bestSimIdx >= 0 && (() => {
              const best = simsData[bestSimIdx];
              return (
                <div className={`rounded-2xl border-2 ${BORDER_CLS[bestSimIdx]} ${BG_CLS[bestSimIdx]} px-5 py-4`}>
                  <div className={`flex items-center gap-2 mb-2 ${TEXT_CLS[bestSimIdx]}`}>
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm font-bold">Recomendación: {best.bank}</span>
                  </div>
                  <p className="text-sm text-slate-700">
                    La simulación con <strong>{best.bank}</strong> presenta la TCEA más baja
                    ({best.tcea ? fmtPs(best.tcea) : "N/D"}), representando el menor costo efectivo anual.
                    Costo total: <strong>{fmtS(costoTotal(best))}</strong> sobre un principal de <strong>{fmtS(best.principal)}</strong>.
                  </p>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </div>
  );
}