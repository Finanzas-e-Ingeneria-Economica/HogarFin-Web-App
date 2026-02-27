"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabasePage() {
  const [msg, setMsg] = useState("Probando conexión...");

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMsg("Error: " + error.message);
        return;
      }
      setMsg("✅ Conexión OK. Session: " + (data.session ? "activa" : "no logueado"));
    };
    run();
  }, []);

  return <div style={{ padding: 24, fontSize: 18 }}>{msg}</div>;
}