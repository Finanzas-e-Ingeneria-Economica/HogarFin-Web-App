"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton({ iconOnly }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        onClick={logout}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-300 bg-white text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-400 hover:text-red-700 active:scale-[0.98]"
      >
        <LogOut className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-400 hover:text-red-700 active:scale-[0.98]"
    >
      <LogOut className="h-4 w-4" />
      <span>Cerrar sesión</span>
    </button>
  );
}