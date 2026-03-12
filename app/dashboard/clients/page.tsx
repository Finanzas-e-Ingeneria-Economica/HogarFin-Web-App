"use client";

import ClientCard from "./_components/ClientCard";
import ClientModal from "./_components/ClientModal";
import DeleteClientModal from "./_components/DeleteClientModal";
import { money } from "./_utils/pdfGenerator";
import { useClients } from "./_hooks/useClients";

export type ClientRow = {
  id: number;
  user_id: string;
  dni: string;
  names: string;
  last_names: string;
  monthly_income: number | null;
  monthly_expenses: number;
  dependents: number;
  email: string | null;
  phone: string | null;
  residence_location: string | null;
  occupation: string | null;
  income_range: string | null;
  education_level: string | null;
  created_at: string;
  updated_at: string;
};

export default function ClientsPage() {
  const {
    userId, loading, busy, generating,
    query, setQuery, open, editing, deleteOpen, deletingClient, filtered,
    askDelete, cancelDelete, confirmDelete, onNew, onEdit, onClose, upsertClient, handleGeneratePDF
  } = useClients();

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Crea y gestiona la información de tus clientes.</p>
        </div>
        <button
          onClick={onNew}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por DNI / nombres / apellidos / email"
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
          {loading ? "Cargando..." : `${filtered.length} cliente(s)`}
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[200px] animate-pulse rounded-2xl border border-slate-200 bg-white/60 shadow-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-sm">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                <span className="text-xl">👤</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Aún no tienes clientes registrados
              </h2>
              <p className="text-sm text-slate-500">
                Crea tu primer cliente para empezar a registrar propiedades y realizar simulaciones.
              </p>
              <button
                onClick={onNew}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90"
              >
                + Nuevo cliente
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                money={money}
                onEdit={() => onEdit(c)}
                onDelete={() => askDelete(c.id)}
                onGeneratePDF={() => handleGeneratePDF(c)}
                generatingPDF={generating === c.id}
                disabled={busy}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALES */}
      <ClientModal
        open={open}
        onClose={onClose}
        onSave={upsertClient}
        saving={busy}
        initial={editing}
        userId={userId}
      />
      
      <DeleteClientModal
        open={deleteOpen}
        title={deletingClient ? `Eliminar a ${deletingClient.names} ${deletingClient.last_names}` : "Eliminar cliente"}
        description="¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer."
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        loading={busy}
      />
    </div>
  );
}