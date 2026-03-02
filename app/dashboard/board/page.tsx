"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Users, Building2, Calculator, TrendingUp,
  ArrowRight, Clock, DollarSign, BarChart3,
  CheckCircle2, AlertCircle, HomeIcon, Zap,
} from "lucide-react";

type Stat = { clients: number; properties: number; simulations: number };

type RecentSim = {
  id: number;
  created_at: string;
  principal: number;
  monthly_payment: number;
  monthly_rate: number;
  tcea: number | null;
  van: number | null;
  term_months: number;
  grace_type: string;
  annual_rate_used: number;
  rate_type_used: string;
  clients: { names: string; last_names: string } | null;
  properties: { name: string } | null;
  financial_entities: { name: string } | null;
};

const fmt = (v: number) =>
  `S/ ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
const fmtPs = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtP  = (v: number) => `${(v * 100).toFixed(4)}%`;

export default function BoardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Usuario");
  const [stats, setStats] = useState<Stat>({ clients: 0, properties: 0, simulations: 0 });
  const [recentSims, setRecentSims] = useState<RecentSim[]>([]);
  const [loading, setLoading] = useState(true);
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    loadData();
    setHour(new Date().getHours());
  }, []);

  async function loadData() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;

    const email = u.user?.email ?? "";
    setDisplayName(email.split("@")[0]);

    const [
      { count: clientCount },
      { count: propCount },
      { count: simCount },
      { data: sims },
    ] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("properties").select("*", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("loan_simulations").select("*", { count: "exact", head: true }).eq("user_id", uid),
      supabase
        .from("loan_simulations")
        .select(`
          id, created_at, principal, monthly_payment, monthly_rate,
          tcea, van, term_months, grace_type, annual_rate_used, rate_type_used,
          clients(names, last_names),
          properties(name),
          financial_entities(name)
        `)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setStats({
      clients: clientCount ?? 0,
      properties: propCount ?? 0,
      simulations: simCount ?? 0,
    });
    if (sims) setRecentSims(sims as RecentSim[]);
    setLoading(false);
  }

  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const dateStr = (d: string) =>
    new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-10 pt-6 space-y-6">

        {/* Saludo */}
        <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">{greeting},</p>
              <h1 className="mt-0.5 text-2xl font-bold capitalize">{displayName} </h1>
              <p className="mt-1 text-sm text-green-100">
                Bienvenido a HogarFin — Crédito MiVivienda
              </p>
            </div>
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <HomeIcon className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Clientes registrados"
            value={loading ? "—" : stats.clients.toString()}
            sub="en tu cartera"
            color="blue"
            onClick={() => router.push("/dashboard/clients")}
          />
          <StatCard
            icon={<Building2 className="h-5 w-5" />}
            label="Inmuebles cargados"
            value={loading ? "—" : stats.properties.toString()}
            sub="disponibles para simular"
            color="purple"
            onClick={() => router.push("/dashboard/properties")}
          />
          <StatCard
            icon={<Calculator className="h-5 w-5" />}
            label="Simulaciones guardadas"
            value={loading ? "—" : stats.simulations.toString()}
            sub="en el historial"
            color="green"
            onClick={() => router.push("/dashboard/simulate/history")}
          />
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              icon={<Users className="h-4 w-4" />}
              label="Nuevo cliente"
              onClick={() => router.push("/dashboard/clients")}
            />
            <QuickAction
              icon={<Building2 className="h-4 w-4" />}
              label="Nuevo inmueble"
              onClick={() => router.push("/dashboard/properties")}
            />
            <QuickAction
              icon={<Zap className="h-4 w-4" />}
              label="Nueva simulación"
              onClick={() => router.push("/dashboard/simulate")}
              primary
            />
            <QuickAction
              icon={<Clock className="h-4 w-4" />}
              label="Ver historial"
              onClick={() => router.push("/dashboard/simulate/history")}
            />
          </div>
        </div>

        {/* Simulaciones recientes */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Simulaciones recientes</h2>
            {stats.simulations > 5 && (
              <button
                onClick={() => router.push("/dashboard/simulate/history")}
                className="flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : recentSims.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/70 py-12 text-center shadow-sm">
              <Calculator className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">Aún no hay simulaciones.</p>
              <button
                onClick={() => router.push("/dashboard/simulate")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95 shadow-sm"
              >
                <Zap className="h-3.5 w-3.5" /> Crear primera simulación
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSims.map(sim => (
                <div
                  key={sim.id}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 shadow-sm backdrop-blur hover:shadow-md transition cursor-pointer"
                  onClick={() => router.push("/dashboard/simulate/history")}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-slate-400">#{sim.id}</span>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {sim.financial_entities?.name ?? "—"}
                        </span>
                        {sim.grace_type !== "NONE" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Gracia
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{dateStr(sim.created_at)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">
                          {sim.clients ? `${sim.clients.names} ${sim.clients.last_names}` : "—"}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span>{sim.properties?.name ?? "—"}</span>
                        <span className="text-slate-400">·</span>
                        <span>{sim.rate_type_used} {((sim.annual_rate_used ?? 0) * 100).toFixed(2)}% · {sim.term_months / 12} años</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-1">
                      <span className="text-sm font-bold text-slate-900">{fmt(sim.principal)}</span>
                      <span className="text-xs text-slate-500">Cuota: {fmt(sim.monthly_payment)}</span>
                      <div className="flex gap-2">
                        <span className="text-xs text-slate-500">TEM: {fmtP(sim.monthly_rate)}</span>
                        {sim.tcea != null && (
                          <span className="text-xs text-violet-600">TCEA: {fmtPs(sim.tcea)}</span>
                        )}
                        {sim.van != null && (
                          <span className={`text-xs font-medium ${sim.van >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            VAN: {fmt(sim.van)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado del sistema */}
        {!loading && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Estado del sistema</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <StatusRow
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                label="Base de datos"
                status="Conectada"
                ok
              />
              <StatusRow
                icon={stats.clients > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                label="Clientes"
                status={stats.clients > 0 ? `${stats.clients} registrado${stats.clients !== 1 ? "s" : ""}` : "Sin clientes aún"}
                ok={stats.clients > 0}
              />
              <StatusRow
                icon={stats.properties > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                label="Inmuebles"
                status={stats.properties > 0 ? `${stats.properties} cargado${stats.properties !== 1 ? "s" : ""}` : "Sin inmuebles aún"}
                ok={stats.properties > 0}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-componentes ──

function StatCard({ icon, label, value, sub, color, onClick }: {
  icon: React.ReactNode; label: string; value: string;
  sub: string; color: "green" | "blue" | "purple"; onClick: () => void;
}) {
  const colors = {
    green:  "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue:   "bg-sky-50 text-sky-700 ring-sky-200",
    purple: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  const iconColors = {
    green:  "bg-emerald-100 text-emerald-700",
    blue:   "bg-sky-100 text-sky-700",
    purple: "bg-violet-100 text-violet-700",
  };
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 shadow-sm backdrop-blur hover:shadow-md transition text-left w-full"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconColors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
    </button>
  );
}

function QuickAction({ icon, label, onClick, primary }: {
  icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition hover:opacity-95 ${
        primary
          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatusRow({ icon, label, status, ok }: {
  icon: React.ReactNode; label: string; status: string; ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="text-xs">
        <span className="font-medium text-slate-700">{label}: </span>
        <span className={ok ? "text-emerald-600" : "text-amber-600"}>{status}</span>
      </div>
    </div>
  );
}