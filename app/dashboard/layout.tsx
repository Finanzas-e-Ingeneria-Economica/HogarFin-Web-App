import Link from "next/link";
import { redirect } from "next/navigation";
import MobileSidebarTrigger from "./_components/MobileSidebarTrigger";
import { Menu, Plus, LogOut } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import LogoutButton from "./_components/LogoutButton";
import Sidebar from "./_components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const first = user.user_metadata?.first_name || "";
  const last = user.user_metadata?.last_name || "";
  const displayName = (first + " " + last).trim() || user.email || "Usuario";
  const email = user.email || "";

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      {/* Blobs coherentes con auth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-200/70 blur-3xl" />
        <div className="absolute top-20 -right-24 h-72 w-72 rounded-full bg-cyan-200/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-lime-200/60 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
        <Sidebar displayName={displayName} email={email} />

        <div className="flex flex-col">
          {/* Topbar */}
          <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-4 backdrop-blur-md shadow-sm sm:px-6">
            {/* IZQUIERDA: hamburguesa (solo mobile) */}
            <MobileSidebarTrigger />

            {/* CENTRO: bienvenida */}
            <div className="min-w-0">
              <div className="text-sm text-zinc-500">Bienvenido,</div>
              <div className="truncate font-semibold leading-tight">
                {displayName}
              </div>
            </div>

            {/* DERECHA: acciones */}
            <div className="flex items-center justify-end gap-3">
              {/* Desktop: texto / Mobile: ícono */}
              <Link
                href="/dashboard/simulate"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
              >
                <span className="hidden sm:inline">Nueva simulación</span>
                <span className="sm:hidden">
                  <Plus className="h-5 w-5" />
                </span>
              </Link>

              {/* Desktop: botón actual / Mobile: icono */}
              <div className="hidden sm:block">
                <LogoutButton />
              </div>

              <div className="sm:hidden">
                <LogoutButton iconOnly />
              </div>
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 bg-white/40 backdrop-blur-sm px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}