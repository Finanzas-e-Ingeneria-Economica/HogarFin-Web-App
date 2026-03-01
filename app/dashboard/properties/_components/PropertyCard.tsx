"use client";

import type { PropertyRow } from "../page";

type Props = {
  property: PropertyRow;
  formatCurrency: (amount: number, currency: "PEN" | "USD") => string;
  formatArea: (v: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

const typeBadgeClass = (type: string) => {
  const t = type.toLowerCase();
  if (t === "departamento") return "bg-sky-50 text-sky-700 ring-sky-200";
  if (t === "casa") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (t === "terreno") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
};

export default function PropertyCard({ property, formatCurrency, formatArea, onEdit, onDelete, disabled }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-lg px-2 py-0.5 text-xs ring-1 ${typeBadgeClass(property.property_type)}`}>
                {property.property_type}
              </span>
              <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                {property.currency}
              </span>
            </div>

            <div className="mt-3 truncate text-base font-semibold text-slate-900">{property.name}</div>

            <div className="mt-2 text-lg font-semibold text-slate-900">
              {formatCurrency(property.price, property.currency)}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Inicial:{" "}
              <span className="font-medium text-slate-700">
                {formatCurrency(property.initial_payment, property.currency)}
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
            <div className="text-xs text-slate-500">Área</div>
            <div className="mt-1 font-semibold text-slate-900">{formatArea(property.area_m2)} m²</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">Ubicación</div>
            <div className="mt-1 truncate font-semibold text-slate-900">{property.location}</div>
          </div>
        </div>
      </div>
    </div>
  );
}