"use client";

import Link from "next/link";
import { EyeIcon, EyeOffIcon, CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ruleStatus(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function CheckDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full ${
        ok ? "bg-emerald-500" : "bg-zinc-300"
      }`}
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const rules = useMemo(() => ruleStatus(password), [password]);
  const allRulesOk = Object.values(rules).every(Boolean);
  const passwordsMatch = confirm.length > 0 && password === confirm;

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      email.trim().length > 3 &&
      allRulesOk &&
      password === confirm &&
      acceptTerms &&
      acceptPrivacy &&
      !loading
    );
  }, [
    firstName,
    lastName,
    email,
    allRulesOk,
    password,
    confirm,
    acceptTerms,
    acceptPrivacy,
    loading,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: "staff",
          app: "hogarfin",
        },
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    setSuccess("Cuenta creada. Ahora inicia sesión.");
    await supabase.auth.signOut();
    setLoading(false);
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-7 shadow-[0_12px_40px_rgba(0,0,0,0.10)] backdrop-blur">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Crear cuenta</h2>
      </div>

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">Nombre</label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              placeholder="Jhon"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700">
              Apellido
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

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
          <label className="text-xs font-medium text-zinc-700">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
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

          <div className="mt-2 grid grid-cols-1 gap-1">
            <div className="flex items-center gap-2 text-sm">
              <CheckDot ok={rules.length} />
              <span
                className={rules.length ? "text-zinc-800" : "text-zinc-500"}
              >
                Al menos 8 caracteres
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckDot ok={rules.upper} />
              <span className={rules.upper ? "text-zinc-800" : "text-zinc-500"}>
                Una mayúscula
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckDot ok={rules.lower} />
              <span className={rules.lower ? "text-zinc-800" : "text-zinc-500"}>
                Una minúscula
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckDot ok={rules.number} />
              <span
                className={rules.number ? "text-zinc-800" : "text-zinc-500"}
              >
                Un número
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckDot ok={rules.special} />
              <span
                className={rules.special ? "text-zinc-800" : "text-zinc-500"}
              >
                Un carácter especial
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className={`w-full rounded-xl border bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:ring-4 ${
                confirm.length === 0
                  ? "border-zinc-200 focus:border-indigo-300 focus:ring-indigo-100"
                  : passwordsMatch
                    ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                    : "border-red-300 focus:border-red-400 focus:ring-red-100"
              }`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-zinc-100"
              aria-label={
                showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {showConfirm ? (
                <EyeOffIcon className="h-4 w-4 text-zinc-600" />
              ) : (
                <EyeIcon className="h-4 w-4 text-zinc-600" />
              )}
            </button>
          </div>

          {confirm.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-600">
              Las contraseñas no coinciden.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            Acepto los términos y condiciones
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
            />
            Acepto la política de privacidad
          </label>
        </div>

        <button
          disabled={!canSubmit}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-40"
          type="submit"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <div className="pt-2 text-center text-sm text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <Link
            className="font-medium text-zinc-900 hover:underline"
            href="/auth/login"
          >
            Inicia sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
