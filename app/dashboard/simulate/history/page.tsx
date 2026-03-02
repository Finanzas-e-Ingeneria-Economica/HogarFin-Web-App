"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  History, Search, Eye, Trash2, Building2, User,
  Calendar, TrendingUp, DollarSign, ChevronDown, ChevronUp,
  AlertCircle, Clock, FileSpreadsheet, Download,
} from "lucide-react";
import { fmt, fmtPs, fmtP, n2 } from "../_utils/format";
import ScheduleTable from "../_components/ScheduleTable";
import type { ScheduleRow } from "../_utils/types";

type Simulation = {
  id: number;
  created_at: string;
  currency: string;
  principal: number;
  term_months: number;
  monthly_payment: number;
  monthly_rate: number;
  tcea: number | null;
  van: number | null;
  tir: number | null;
  grace_type: string;
  grace_months: number;
  annual_rate_used: number;
  rate_type_used: string;
  property_value: number;
  exchange_rate_used: number;
  clients: { names: string; last_names: string; dni: string } | null;
  properties: { name: string; location: string; currency: string } | null;
  financial_entities: { name: string } | null;
};

type SimDetail = Simulation & { rows: ScheduleRow[] };

export default function HistoryPage() {
  const router = useRouter();
  const [sims, setSims] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<number, ScheduleRow[]>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState<Record<number, boolean>>({});

  useEffect(() => { loadSims(); }, []);

  async function loadSims() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { data } = await supabase
      .from("loan_simulations")
      .select(`
        id, created_at, currency, principal, term_months, monthly_payment,
        monthly_rate, tcea, van, tir, grace_type, grace_months,
        annual_rate_used, rate_type_used, property_value, exchange_rate_used,
        clients(names, last_names, dni),
        properties(name, location, currency),
        financial_entities(name)
      `)
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });

    if (data) setSims(data as Simulation[]);
    setLoading(false);
  }

  async function loadDetail(simId: number) {
    if (detail[simId]) {
      setExpanded(expanded === simId ? null : simId);
      return;
    }
    setLoadingDetail(simId);
    const { data } = await supabase
      .from("schedule_rows")
      .select("*")
      .eq("simulation_id", simId)
      .order("n");

    if (data) {
      const rows: ScheduleRow[] = data.map(r => ({
        period: r.n,
        balance: r.balance,
        interest: r.interest,
        amort: r.amortization,
        basePayment: r.base_payment ?? r.payment,
        desgravamen: r.desgravamen ?? 0,
        propertyInsurance: r.property_insurance ?? 0,
        monthlyFees: r.monthly_fees ?? 0,
        totalPayment: r.total_payment ?? r.payment,
        cashflow: r.cashflow ?? -r.payment,
        isGrace: r.is_grace_period ?? false,
      }));
      setDetail(prev => ({ ...prev, [simId]: rows }));
    }
    setLoadingDetail(null);
    setExpanded(simId);
  }

  async function deleteSim(simId: number) {
    if (!confirm("¿Eliminar esta simulación y su cronograma?")) return;
    setDeleting(simId);
    await supabase.from("schedule_rows").delete().eq("simulation_id", simId);
    await supabase.from("loan_simulations").delete().eq("id", simId);
    setSims(prev => prev.filter(s => s.id !== simId));
    if (expanded === simId) setExpanded(null);
    setDeleting(null);
  }

  function exportDetailCSV(sim: Simulation, rows: ScheduleRow[]) {
    const client = sim.clients ? `${sim.clients.names} ${sim.clients.last_names}` : "Cliente";
    const meta = [
      ["SIMULACIÓN HOGARFIN – CRÉDITO MIVIVIENDA"],
      [],
      ["ID:", sim.id],
      ["Fecha:", new Date(sim.created_at).toLocaleDateString("es-PE")],
      ["Cliente:", client],
      ["Inmueble:", sim.properties?.name ?? "—"],
      ["Entidad:", sim.financial_entities?.name ?? "—"],
      ["Principal:", `S/ ${n2(sim.principal)}`],
      ["TEM:", fmtP(sim.monthly_rate)],
      ["TCEA:", sim.tcea ? fmtPs(sim.tcea) : "N/D"],
      ["VAN:", sim.van != null ? `S/ ${n2(sim.van)}` : "N/D"],
      ["TIR:", sim.tir ? fmtPs(sim.tir) : "N/D"],
      [],
      ["N°", "Tipo", "Interés", "Amortización", "Cuota", "Desgravamen", "Seg.Inmueble", "Portes", "Saldo", "Flujo"],
      ...rows.map(r => [
        r.period, r.isGrace ? "GRACIA" : "NORMAL",
        n2(r.interest), n2(r.amort), n2(r.basePayment),
        n2(r.desgravamen), n2(r.propertyInsurance), n2(r.monthlyFees),
        n2(r.balance), n2(r.cashflow),
      ]),
    ];
    const csv = meta.map(row => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `HogarFin_Sim_${sim.id}_${client.replace(/\s/g, "_")}.csv`;
    a.click();
  }

  const filtered = sims.filter(s => {
    const q = search.toLowerCase();
    return (
      s.clients?.names?.toLowerCase().includes(q) ||
      s.clients?.last_names?.toLowerCase().includes(q) ||
      s.clients?.dni?.includes(q) ||
      s.properties?.name?.toLowerCase().includes(q) ||
      s.financial_entities?.name?.toLowerCase().includes(q)
    );
  });

  const dateStr = (d: string) =>
    new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-10 pt-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Historial de Simulaciones</h1>
            <p className="mt-1 text-sm text-slate-500">
              {sims.length} simulación{sims.length !== 1 ? "es" : ""} guardada{sims.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/simulate")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 transition"
          >
            + Nueva Simulación
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, inmueble o banco..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/70 py-16 text-center shadow-sm">
            <History className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {search ? "No se encontraron resultados." : "Aún no hay simulaciones guardadas."}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/dashboard/simulate")}
                className="mt-1 text-sm font-semibold text-green-700 hover:underline"
              >
                Crear primera simulación →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sim => {
              const isOpen = expanded === sim.id;
              const rows = detail[sim.id] ?? [];
              const fullSchedule = showFullSchedule[sim.id] ?? false;

              return (
                <div
                  key={sim.id}
                  className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden"
                >
                  {/* Fila principal */}
                  <div className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      {/* Info izquierda */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">#{sim.id}</span>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            {sim.financial_entities?.name ?? "—"}
                          </span>
                          {sim.grace_type !== "NONE" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Gracia {sim.grace_type === "TOTAL" ? "Total" : "Parcial"} · {sim.grace_months}m
                            </span>
                          )}
                          {sim.exchange_rate_used && sim.exchange_rate_used !== 1 && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              USD → PEN
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {sim.clients ? `${sim.clients.names} ${sim.clients.last_names}` : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{sim.properties?.name ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{sim.rate_type_used} {((sim.annual_rate_used ?? 0) * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{dateStr(sim.created_at)}</span>
                          </div>
                        </div>

                        {/* KPIs compactos */}
                        <div className="flex flex-wrap gap-3 pt-1">
                          <KPIBadge label="Principal" value={fmt(sim.principal, "PEN")} />
                          <KPIBadge label="Cuota base" value={fmt(sim.monthly_payment, "PEN")} />
                          <KPIBadge label="Plazo" value={`${sim.term_months / 12} años`} />
                          <KPIBadge label="TEM" value={fmtP(sim.monthly_rate)} />
                          {sim.tcea != null && <KPIBadge label="TCEA" value={fmtPs(sim.tcea)} />}
                          {sim.van != null && (
                            <KPIBadge
                              label="VAN"
                              value={fmt(sim.van, "PEN")}
                              positive={sim.van >= 0}
                            />
                          )}
                          {sim.tir != null && <KPIBadge label="TIR" value={fmtPs(sim.tir)} />}
                        </div>
                      </div>

                      {/* Acciones derecha */}
                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                        <button
                          onClick={() => loadDetail(sim.id)}
                          disabled={loadingDetail === sim.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
                        >
                          {loadingDetail === sim.id ? (
                            <span className="animate-pulse">Cargando...</span>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              {isOpen ? "Ocultar" : "Cronograma"}
                              {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </>
                          )}
                        </button>

                        {isOpen && rows.length > 0 && (
                          <button
                            onClick={() => exportDetailCSV(sim, rows)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                            Excel
                          </button>
                        )}

                        <button
                          onClick={() => deleteSim(sim.id)}
                          disabled={deleting === sim.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 shadow-sm disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deleting === sim.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cronograma expandible */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <Clock className="h-4 w-4 text-green-700" />
                          Cronograma de Pagos
                          <span className="text-xs font-normal text-slate-500">({rows.length} periodos)</span>
                        </div>
                        <button
                          onClick={() => setShowFullSchedule(prev => ({ ...prev, [sim.id]: !prev[sim.id] }))}
                          className="text-xs font-medium text-green-700 hover:underline"
                        >
                          {fullSchedule ? "Ver menos" : "Ver completo"}
                        </button>
                      </div>

                      {rows.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <AlertCircle className="h-4 w-4" />
                          No hay cronograma guardado para esta simulación.
                        </div>
                      ) : (
                        <>
                          <ScheduleTable rows={rows.slice(0, fullSchedule ? undefined : 6)} />
                          {!fullSchedule && rows.length > 6 && (
                            <div className="mt-2 text-center text-xs text-slate-400">
                              ... y {rows.length - 6} periodos más
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KPIBadge({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-xs font-bold ${positive === false ? "text-rose-600" : positive === true ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}