import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Client, Property } from "../_utils/types";

export function useSimulationData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const fxCacheRef = useRef<number | null>(null);

  const getUsdPenRate = useCallback(async () => {
    if (fxCacheRef.current && fxCacheRef.current > 0) return fxCacheRef.current;

    const { data: fx } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("currency_from", "USD")
      .eq("currency_to", "PEN")
      .eq("is_active", true)
      .maybeSingle();

    const rate = Number(fx?.rate) || 3.75;
    fxCacheRef.current = rate;
    return rate;
  }, []);

  const loadAll = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);
    if (!uid) return;

    const [{ data: cls }, { data: props }] = await Promise.all([
      supabase
        .from("clients")
        .select("id,names,last_names,dni,monthly_income,dependents")
        .eq("user_id", uid)
        .order("names"),
      supabase
        .from("properties")
        .select("id,name,price,currency,initial_payment,location,property_type")
        .eq("user_id", uid)
        .order("name"),
    ]);

    setClients((cls ?? []) as Client[]);
    setProperties((props ?? []) as Property[]);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { userId, clients, properties, getUsdPenRate };
}