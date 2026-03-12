import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { generarFichaCliente } from "../_utils/pdfGenerator";
import type { ClientRow } from "../page";

export function useClients() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const askDelete = useCallback((id: number) => {
    setDeletingId(id);
    setDeleteOpen(true);
  }, []);

  const deletingClient = useMemo(
    () => clients.find((c) => c.id === deletingId) ?? null,
    [clients, deletingId],
  );

  const cancelDelete = useCallback(() => {
    if (busy) return;
    setDeleteOpen(false);
    setDeletingId(null);
  }, [busy]);

  const load = useCallback(async () => {
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
      .select("id,user_id,dni,names,last_names,monthly_income,monthly_expenses,dependents,email,phone,residence_location,occupation,income_range,education_level,created_at,updated_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) setClients(data as ClientRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteClient = useCallback(async (id: number) => {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from("clients").delete().eq("id", id).eq("user_id", userId);
    if (!error) await load();
    setBusy(false);
  }, [userId, load]);

  const confirmDelete = useCallback(async () => {
    if (deletingId === null) return;
    await deleteClient(deletingId);
    setDeleteOpen(false);
    setDeletingId(null);
  }, [deletingId, deleteClient]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const hay = `${c.dni} ${c.names} ${c.last_names} ${c.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  const onNew = useCallback(() => { setEditing(null); setOpen(true); }, []);
  const onEdit = useCallback((client: ClientRow) => { setEditing(client); setOpen(true); }, []);
  const onClose = useCallback(() => setOpen(false), []);

  const upsertClient = useCallback(async (
    payload: Omit<ClientRow, "id" | "created_at" | "updated_at"> & { id?: number },
  ) => {
    if (!userId) return;
    setBusy(true);

    if (payload.id) {
      const { error } = await supabase
        .from("clients")
        .update({
          dni: payload.dni, names: payload.names, last_names: payload.last_names,
          monthly_income: payload.monthly_income, monthly_expenses: payload.monthly_expenses,
          dependents: payload.dependents, email: payload.email, phone: payload.phone,
          residence_location: payload.residence_location, occupation: payload.occupation,
          income_range: payload.income_range, education_level: payload.education_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .eq("user_id", userId);
      if (!error) { await load(); setOpen(false); }
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("clients").insert({
      user_id: userId, dni: payload.dni, names: payload.names,
      last_names: payload.last_names, monthly_income: payload.monthly_income,
      monthly_expenses: payload.monthly_expenses, dependents: payload.dependents,
      email: payload.email, phone: payload.phone,
      residence_location: payload.residence_location, occupation: payload.occupation,
      income_range: payload.income_range, education_level: payload.education_level,
    });
    if (!error) { await load(); setOpen(false); }
    setBusy(false);
  }, [userId, load]);

  const handleGeneratePDF = useCallback(async (client: ClientRow) => {
    setGenerating(client.id);
    await generarFichaCliente(client);
    setGenerating(null);
  }, []);

  return {
    userId, loading, busy, generating,
    query, setQuery, open, editing, deleteOpen, deletingClient, filtered,
    askDelete, cancelDelete, confirmDelete, onNew, onEdit, onClose, upsertClient, handleGeneratePDF
  };
}