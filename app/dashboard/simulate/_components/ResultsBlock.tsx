import { CheckCircle2, FileSpreadsheet, Download, Clock } from "lucide-react";
import type { Client, Entity, Property, SimResults } from "../_utils/types";
import { exportExcel, exportPDF } from "../_utils/exports";
import { fmt, fmtP, fmtPs, n2 } from "../_utils/format";
import KPI from "./KPI";
import Chip from "./Chip";
import ScheduleTable from "./ScheduleTable";

export default function ResultsBlock({
  results,
  saved,
  termYears,
  rateType,
  annualRate,
  cok,
  graceTotalMonths,
  gracePartialMonths,
  entityData,
  clientData,
  propData,
  showSchedule,
  setShowSchedule,
}: {
  results: SimResults;
  saved: boolean;
  termYears: number;
  rateType: "TEA" | "TNA";
  annualRate: string;
  cok: string;
  graceTotalMonths: number;
  gracePartialMonths: number;
  entityData?: Entity;
  clientData?: Client;
  propData?: Property;
  showSchedule: boolean;
  setShowSchedule: (v: (prev: boolean) => boolean) => void;
}) {
  const cokA = Number(cok) / 100;
  const cokM =
    Number.isFinite(cokA) && cokA > 0
      ? ((Math.pow(1 + cokA, 1 / 12) - 1) * 100).toFixed(2)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Resultados</h2>

        <div className="flex gap-2">
          <button
            onClick={() =>
              exportExcel(
                results,
                results.currency,
                entityData?.name ?? "Banco",
                clientData
                  ? `${clientData.names} ${clientData.last_names}`
                  : "Cliente",
                propData?.name ?? "Inmueble",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
            Excel
          </button>

          <button
            onClick={() =>
              exportPDF(
                results,
                results.currency,
                entityData?.name ?? "Banco",
                clientData
                  ? `${clientData.names} ${clientData.last_names}`
                  : "Cliente",
                propData?.name ?? "Inmueble",
                termYears,
                rateType,
                annualRate,
                cok,
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-rose-500" />
            PDF
          </button>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Simulación guardada
          correctamente.
        </div>
      )}

      {results.exchangeRateUsed !== 1 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          💱 T.C. usado:{" "}
          <strong>1 USD = {n2(results.exchangeRateUsed)} PEN</strong>. Valores
          en PEN.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KPI
          label="Cuota mensual base"
          value={fmt(results.monthlyPayment, "PEN")}
          sub="Sin seguros ni portes"
          color="green"
        />
        <KPI
          label="TEM"
          value={fmtP(results.tem)}
          sub="Tasa Efectiva Mensual"
          color="blue"
        />
        <KPI
          label="TCEA"
          value={results.tcea > 0 ? fmtPs(results.tcea) : "N/D"}
          sub="Costo Efectivo Anual"
          color="purple"
        />
        <KPI
          label="VAN"
          value={fmt(results.van, "PEN")}
          sub={cokM ? `COK ${cokM}% mensual` : "COK mensual: N/D"}
          color={results.van >= 0 ? "green" : "red"}
        />
        <KPI
          label="TIR mensual"
          value={results.tirM > 0 ? fmtPs(results.tirM) : "N/D"}
          sub="Tasa Interna de Retorno"
          color="orange"
        />
        <KPI
          label="Principal (PEN)"
          value={fmt(results.principalPEN, "PEN")}
          sub="Monto a financiar"
          color="blue"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Chip
          label={`${results.rateType} ingresada`}
          value={fmtPs(results.annualRate)}
        />
        <Chip label="Plazo" value={`${termYears} años · ${termYears * 12}m`} />
        <Chip
          label="Cuota total (con seguros)"
          value={fmt(
            results.schedule.find((r) => !r.isGrace)?.totalPayment ?? 0,
            "PEN",
          )}
        />
        <Chip
          label="Gracia"
          value={`Total: ${graceTotalMonths}m / Parcial: ${gracePartialMonths}m`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-700" />
            <span className="text-sm font-semibold text-slate-800">
              Cronograma de Pagos
            </span>
          </div>
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="text-xs font-medium text-green-700 hover:underline"
          >
            {showSchedule ? "Ver menos" : "Ver completo"}
          </button>
        </div>

        <div className="px-4 py-3">
          <ScheduleTable
            rows={results.schedule.slice(0, showSchedule ? undefined : 6)}
          />
          {!showSchedule && results.schedule.length > 6 && (
            <div className="mt-2 text-center text-xs text-slate-400">
              ... y {results.schedule.length - 6} periodos más
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
