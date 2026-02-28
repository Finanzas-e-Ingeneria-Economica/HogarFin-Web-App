"use client";

import type { ClientRow } from "../page";

type Props = {
  client: ClientRow;
  money: (v: number | null | undefined) => string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export default function ClientCard({
  client,
  money,
  onEdit,
  onDelete,
  disabled,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900">
              {client.names} {client.last_names}
            </div>
            <div className="mt-1 inline-flex items-center gap-2">
              <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                DNI: {client.dni}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              disabled={disabled}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Editar
            </button>
            <button
              onClick={onDelete}
              disabled={disabled}
              className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">Ingreso mensual</div>
            <div className="mt-1 font-semibold text-slate-900">
              {money(client.monthly_income)}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">Egreso mensual</div>
            <div className="mt-1 font-semibold text-slate-900">
              {money(client.monthly_expenses)}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">Dependientes</div>
            <div className="mt-1 font-semibold text-slate-900">
              {client.dependents}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">Ocupación</div>
            <div className="mt-1 truncate font-semibold text-slate-900">
              {client.occupation ?? "-"}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Email</span>
            <span className="truncate font-medium text-slate-700">
              {client.email ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Teléfono</span>
            <span className="truncate font-medium text-slate-700">
              {client.phone ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Residencia</span>
            <span className="truncate font-medium text-slate-700">
              {client.residence_location ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Rango ingresos</span>
            <span className="truncate font-medium text-slate-700">
              {client.income_range ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Educación</span>
            <span className="truncate font-medium text-slate-700">
              {client.education_level ?? "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
