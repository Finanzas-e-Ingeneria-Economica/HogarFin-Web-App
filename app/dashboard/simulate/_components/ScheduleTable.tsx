import { n2 } from "../_utils/format";
import type { ScheduleRow } from "../_utils/types";

export default function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            {[
              "N°",
              "Interés",
              "Amort.",
              "Cuota",
              "Desg.",
              "Seg.",
              "Saldo Final",
              "Flujo",
            ].map((h) => (
              <th key={h} className="whitespace-nowrap px-2.5 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.period}
              className={`border-t border-slate-100 ${r.isGrace ? "bg-amber-50/60" : "hover:bg-slate-50"}`}
            >
              <td className="px-2.5 py-1.5 font-medium text-slate-700">
                {r.period}
                {r.isGrace && (
                  <span className="ml-1 rounded bg-amber-200 px-1 text-[9px] text-amber-800">
                    G
                  </span>
                )}
              </td>
              <td className="px-2.5 py-1.5">{n2(r.interest)}</td>
              <td className="px-2.5 py-1.5">{n2(r.amort)}</td>
              <td className="px-2.5 py-1.5">{n2(r.basePayment)}</td>
              <td className="px-2.5 py-1.5">{n2(r.desgravamen)}</td>
              <td className="px-2.5 py-1.5">{n2(r.propertyInsurance)}</td>
              <td className="px-2.5 py-1.5 text-slate-600">{n2(r.balance)}</td>
              <td className={`px-2.5 py-1.5 font-semibold ${ r.cashflow < 0 ? "text-red-600" : "text-emerald-600" }`}>{n2(r.cashflow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
