"use client";

import { useEffect, useMemo, useState } from "react";
import ClientCard from "./_components/ClientCard";
import ClientModal from "./_components/ClientModal";
import DeleteClientModal from "./_components/DeleteClientModal";
import { supabase } from "@/lib/supabaseClient";

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

const money = (v: number | null | undefined) => {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(v);
};

export default function ClientsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const askDelete = (id: number) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const deletingClient = useMemo(
    () => clients.find((c) => c.id === deletingId) ?? null,
    [clients, deletingId],
  );

  const cancelDelete = () => {
    if (busy) return;
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    await deleteClient(deletingId);
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const hay =
        `${c.dni} ${c.names} ${c.last_names} ${c.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  const load = async () => {
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setClients([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id,user_id,dni,names,last_names,monthly_income,monthly_expenses,dependents,email,phone,residence_location,occupation,income_range,education_level,created_at,updated_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) setClients(data as ClientRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (client: ClientRow) => {
    setEditing(client);
    setOpen(true);
  };

  const onClose = () => setOpen(false);

  const upsertClient = async (
    payload: Omit<ClientRow, "id" | "created_at" | "updated_at"> & {
      id?: number;
    },
  ) => {
    if (!userId) return;

    setBusy(true);

    if (payload.id) {
      const { error } = await supabase
        .from("clients")
        .update({
          dni: payload.dni,
          names: payload.names,
          last_names: payload.last_names,
          monthly_income: payload.monthly_income,
          monthly_expenses: payload.monthly_expenses,
          dependents: payload.dependents,
          email: payload.email,
          phone: payload.phone,
          residence_location: payload.residence_location,
          occupation: payload.occupation,
          income_range: payload.income_range,
          education_level: payload.education_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .eq("user_id", userId);

      if (!error) {
        await load();
        setOpen(false);
      }

      setBusy(false);
      return;
    }

    const { error } = await supabase.from("clients").insert({
      user_id: userId,
      dni: payload.dni,
      names: payload.names,
      last_names: payload.last_names,
      monthly_income: payload.monthly_income,
      monthly_expenses: payload.monthly_expenses,
      dependents: payload.dependents,
      email: payload.email,
      phone: payload.phone,
      residence_location: payload.residence_location,
      occupation: payload.occupation,
      income_range: payload.income_range,
      education_level: payload.education_level,
    });

    if (!error) {
      await load();
      setOpen(false);
    }

    setBusy(false);
  };

  const deleteClient = async (id: number) => {
    if (!userId) return;
    setBusy(true);

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (!error) await load();

    setBusy(false);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">
            Crea y gestiona la información de tus clientes.
          </p>
        </div>

        <button
          onClick={onNew}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90"
        >
          + Nuevo cliente
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por DNI / nombres / apellidos / email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
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

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[180px] animate-pulse rounded-2xl border border-slate-200 bg-white/60 shadow-sm"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-sm">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <span className="text-xl">👤</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Aún no tienes clientes registrados
              </h2>
              <p className="text-sm text-slate-500">
                Crea tu primer cliente para empezar a registrar propiedades y
                realizar simulaciones.
              </p>
              <button
                onClick={onNew}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90"
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
                disabled={busy}
              />
            ))}
          </div>
        )}
      </div>

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
        title={
          deletingClient
            ? `Eliminar a ${deletingClient.names} ${deletingClient.last_names}`
            : "Eliminar cliente"
        }
        description="¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer."
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        loading={busy}
      />
    </div>
  );
}
