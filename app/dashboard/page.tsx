"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setEmail(data.user.email ?? "");
    };
    load();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm">Sesión activa: {email}</p>

      <button onClick={logout} className="border rounded-lg px-4 py-2">
        Cerrar sesión
      </button>
      <Link className="underline" href="/clients">Ir a Clientes</Link>
      <Link className="underline" href="/simulate">Ir a Simulación</Link>
    </div>
  );
}