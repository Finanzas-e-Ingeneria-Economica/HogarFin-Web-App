"use client";

import { HomeIcon } from "lucide-react";
import PropertyCard from "./_components/PropertyCard";
import PropertyModal from "./_components/PropertyModal";
import DeletePropertyModal from "./_components/DeletePropertyModal";
import { formatCurrency, formatArea } from "./_utils/formatters";
import { useProperties } from "./_hooks/useProperties";

export type PropertyRow = {
  id: number;
  user_id: string;
  client_id: number | null;
  name: string;
  property_type: string;
  currency: "PEN" | "USD";
  price: number;
  initial_payment: number;
  area_m2: number;
  location: string;
  created_at: string;
  updated_at: string;
};

export default function PropertiesPage() {
  const {
    userId, loading, busy,
    query, setQuery, open, editing, deleteOpen, deletingProperty, filtered,
    onNew, onEdit, onClose, askDelete, cancelDelete, confirmDelete, upsertProperty
  } = useProperties();

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Propiedades</h1>
          <p className="text-sm text-slate-500">
            Gestiona tu inventario de propiedades.
          </p>
        </div>

        <button
          onClick={onNew}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90"
        >
          + Nueva propiedad
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre / ubicación / tipo / moneda"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-green-300 focus:ring-2 focus:ring-green-100"
            />
            {query.trim().length > 0 && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-slate-500">
          {loading ? "Cargando..." : `${filtered.length} propiedad(es)`}
        </div>
      </div>

      {/* LISTA DE PROPIEDADES */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[200px] animate-pulse rounded-2xl border border-slate-200 bg-white/60 shadow-sm"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-sm">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                <HomeIcon className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Aún no tienes propiedades registradas
              </h2>
              <p className="text-sm text-slate-500">
                Crea tu primera propiedad para luego simular con cualquier cliente.
              </p>
              <button
                onClick={onNew}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90"
              >
                + Nueva propiedad
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                formatCurrency={formatCurrency}
                formatArea={formatArea}
                onEdit={() => onEdit(p)}
                onDelete={() => askDelete(p.id)}
                disabled={busy}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALES */}
      <PropertyModal
        open={open}
        onClose={onClose}
        onSave={upsertProperty}
        saving={busy}
        initial={editing}
        userId={userId}
      />

      <DeletePropertyModal
        open={deleteOpen}
        title={deletingProperty ? `Eliminar: ${deletingProperty.name}` : "Eliminar propiedad"}
        description="¿Seguro que deseas eliminar esta propiedad? Esta acción no se puede deshacer."
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        loading={busy}
      />
    </div>
  );
}