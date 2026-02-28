import Link from "next/link";
import { redirect } from "next/navigation";
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
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/70 blur-3xl" />
        <div className="absolute top-20 -right-24 h-72 w-72 rounded-full bg-cyan-200/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-200/60 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen grid-cols-[280px_1fr]">
        <Sidebar displayName={displayName} email={email} />

        <div className="flex flex-col">
          {/* Topbar (más fintech/premium) */}
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md shadow-sm">
            <div>
              <div className="text-sm text-zinc-500">Bienvenido,</div>
              <div className="font-semibold leading-tight">{displayName}</div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/simulate"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
              >
                Nueva simulación
              </Link>

              <LogoutButton />
            </div>
          </header>

          {/* Main con profundidad (menos plano) */}
          <main className="flex-1 px-8 py-8 bg-white/40 backdrop-blur-sm">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}