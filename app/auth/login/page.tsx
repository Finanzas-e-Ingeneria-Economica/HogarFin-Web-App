"use client";

import Link from "next/link";
import { EyeIcon, EyeOffIcon, CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function friendlyAuthError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Tu correo aún no está confirmado.";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(friendlyAuthError(error.message));;
      return;
    }

    router.push("/dashboard/board");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-7 shadow-[0_12px_40px_rgba(0,0,0,0.10)] backdrop-blur">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Iniciar sesión
        </h2>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-700">
              Contraseña
            </label>
            {/* Si luego quieres "Olvidé mi contraseña", lo añadimos aquí */}
          </div>

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-zinc-100"
              aria-label={
                showPass ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {showPass ? (
                <EyeOffIcon className="h-4 w-4 text-zinc-600" />
              ) : (
                <EyeIcon className="h-4 w-4 text-zinc-600" />
              )}
            </button>
          </div>
        </div>

        <button
          disabled={!canSubmit}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-40"
          type="submit"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="pt-2 text-center text-sm text-zinc-600">
          ¿No tienes cuenta?{" "}
          <Link
            className="font-medium text-zinc-900 hover:underline"
            href="/auth/register"
          >
            Crea una aquí
          </Link>
        </div>
      </form>
    </div>
  );
}
