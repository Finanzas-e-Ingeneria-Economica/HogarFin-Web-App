"use client";

import { useEffect, useMemo, useState } from "react";
import { HomeIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import PropertyCard from "./_components/PropertyCard";
import PropertyModal from "./_components/PropertyModal";
import DeletePropertyModal from "./_components/DeletePropertyModal";

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

const formatCurrency = (amount: number, currency: "PEN" | "USD") => {
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    amount,
  );
  return currency === "USD" ? `$ ${n}` : `S/ ${n}`;
};

const formatArea = (v: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);

export default function PropertiesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      const hay =
        `${p.name} ${p.location} ${p.property_type} ${p.currency}`.toLowerCase();
      return hay.includes(q);
    });
  }, [properties, query]);

  const deletingProperty = useMemo(
    () => properties.find((p) => p.id === deletingId) ?? null,
    [properties, deletingId],
  );

  const load = async () => {
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setProperties([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select(
        "id,user_id,client_id,name,property_type,currency,price,initial_payment,area_m2,location,created_at,updated_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) setProperties(data as PropertyRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (p: PropertyRow) => {
    setEditing(p);
    setOpen(true);
  };

  const onClose = () => setOpen(false);

  const askDelete = (id: number) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const cancelDelete = () => {
    if (busy) return;
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const deleteProperty = async (id: number) => {
    if (!userId) return false;
    setBusy(true);

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (!error) await load();
    setBusy(false);
    return !error;
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    const ok = await deleteProperty(deletingId);
    if (ok) {
      setDeleteOpen(false);
      setDeletingId(null);
    }
  };

  const upsertProperty = async (
    payload: Omit<PropertyRow, "id" | "created_at" | "updated_at"> & {
      id?: number;
    },
  ) => {
    if (!userId) return;

    setBusy(true);

    if (payload.id) {
      const { error } = await supabase
        .from("properties")
        .update({
          name: payload.name,
          property_type: payload.property_type,
          currency: payload.currency,
          price: payload.price,
          initial_payment: payload.initial_payment,
          area_m2: payload.area_m2,
          location: payload.location,
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

    const { error } = await supabase.from("properties").insert({
      user_id: userId,
      client_id: null,
      name: payload.name,
      property_type: payload.property_type,
      currency: payload.currency,
      price: payload.price,
      initial_payment: payload.initial_payment,
      area_m2: payload.area_m2,
      location: payload.location,
    });

    if (!error) {
      await load();
      setOpen(false);
    }

    setBusy(false);
  };

  return (
    <div className="w-full">
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
                Crea tu primera propiedad para luego simular con cualquier
                cliente.
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
        title={
          deletingProperty
            ? `Eliminar: ${deletingProperty.name}`
            : "Eliminar propiedad"
        }
        description="¿Seguro que deseas eliminar esta propiedad? Esta acción no se puede deshacer."
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        loading={busy}
      />
    </div>
  );
}