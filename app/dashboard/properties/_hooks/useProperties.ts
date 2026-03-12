import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PropertyRow } from "../page";

export function useProperties() {
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
      const hay = `${p.name} ${p.location} ${p.property_type} ${p.currency}`.toLowerCase();
      return hay.includes(q);
    });
  }, [properties, query]);

  const deletingProperty = useMemo(
    () => properties.find((p) => p.id === deletingId) ?? null,
    [properties, deletingId],
  );

  const load = useCallback(async () => {
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
      .select("id,user_id,client_id,name,property_type,currency,price,initial_payment,area_m2,location,created_at,updated_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) setProperties(data as PropertyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onNew = useCallback(() => { setEditing(null); setOpen(true); }, []);
  const onEdit = useCallback((p: PropertyRow) => { setEditing(p); setOpen(true); }, []);
  const onClose = useCallback(() => setOpen(false), []);

  const askDelete = useCallback((id: number) => { setDeletingId(id); setDeleteOpen(true); }, []);
  const cancelDelete = useCallback(() => { if (busy) return; setDeleteOpen(false); setDeletingId(null); }, [busy]);

  const deleteProperty = useCallback(async (id: number) => {
    if (!userId) return false;
    setBusy(true);
    const { error } = await supabase.from("properties").delete().eq("id", id).eq("user_id", userId);
    if (!error) await load();
    setBusy(false);
    return !error;
  }, [userId, load]);

  const confirmDelete = useCallback(async () => {
    if (deletingId === null) return;
    const ok = await deleteProperty(deletingId);
    if (ok) { setDeleteOpen(false); setDeletingId(null); }
  }, [deletingId, deleteProperty]);

  const upsertProperty = useCallback(async (
    payload: Omit<PropertyRow, "id" | "created_at" | "updated_at"> & { id?: number },
  ) => {
    if (!userId) return;
    setBusy(true);

    if (payload.id) {
      const { error } = await supabase
        .from("properties")
        .update({
          name: payload.name, property_type: payload.property_type, currency: payload.currency,
          price: payload.price, initial_payment: payload.initial_payment, area_m2: payload.area_m2,
          location: payload.location, updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .eq("user_id", userId);

      if (!error) { await load(); setOpen(false); }
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("properties").insert({
      user_id: userId, client_id: null, name: payload.name,
      property_type: payload.property_type, currency: payload.currency,
      price: payload.price, initial_payment: payload.initial_payment,
      area_m2: payload.area_m2, location: payload.location,
    });

    if (!error) { await load(); setOpen(false); }
    setBusy(false);
  }, [userId, load]);

  return {
    userId, loading, busy,
    query, setQuery, open, editing, deleteOpen, deletingProperty, filtered,
    onNew, onEdit, onClose, askDelete, cancelDelete, confirmDelete, upsertProperty
  };
}