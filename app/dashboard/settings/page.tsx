"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  User, Lock, Bell, Shield, Palette, Database,
  CheckCircle2, AlertCircle, Eye, EyeOff, Save,
  Trash2, Download, RefreshCw, DollarSign,
} from "lucide-react";

type Tab = "perfil" | "seguridad" | "preferencias" | "datos";

type Profile = {
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  role: string;
};

type Preferences = {
  default_currency: "PEN" | "USD";
  default_term_years: number;
  default_cok: string;
  theme: "light" | "system";
  notifications_sim: boolean;
  notifications_updates: boolean;
};

const TABS = [
  { id: "perfil",       label: "Perfil",        icon: User },
  { id: "seguridad",    label: "Seguridad",      icon: Lock },
  { id: "preferencias", label: "Preferencias",   icon: Palette },
  { id: "datos",        label: "Mis Datos",      icon: Database },
] as const;

const inp = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const sel = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 cursor-pointer";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("perfil");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  // Perfil
  const [profile, setProfile] = useState<Profile>({
    first_name: "", last_name: "", phone: "", company: "", role: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Seguridad
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Preferencias
  const [prefs, setPrefs] = useState<Preferences>({
    default_currency: "PEN",
    default_term_years: 20,
    default_cok: "12",
    theme: "light",
    notifications_sim: true,
    notifications_updates: false,
  });
  const [prefsMsg, setPrefsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Datos
  const [stats, setStats] = useState({ clients: 0, properties: 0, simulations: 0, scheduleRows: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");
    setUserId(user.id);

    const meta = user.user_metadata ?? {};
    setProfile({
      first_name: meta.first_name ?? "",
      last_name:  meta.last_name  ?? "",
      phone:      meta.phone      ?? "",
      company:    meta.company    ?? "",
      role:       meta.role       ?? "",
    });

    // Cargar preferencias guardadas en metadata
    if (meta.preferences) {
      try { setPrefs({ ...prefs, ...JSON.parse(meta.preferences) }); } catch {}
    }

    // Stats
    const [{ count: c }, { count: p }, { count: s }] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("properties").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("loan_simulations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    let rowCount = 0;
    if ((s ?? 0) > 0) {
      const { count } = await supabase
        .from("schedule_rows")
        .select("loan_simulations!inner(user_id)", { count: "exact", head: true })
        .eq("loan_simulations.user_id", user.id);
      rowCount = count ?? 0;
    }
    setStats({ clients: c ?? 0, properties: p ?? 0, simulations: s ?? 0, scheduleRows: rowCount });
  }

  async function saveProfile() {
    setProfileLoading(true);
    setProfileMsg(null);
    const { error } = await supabase.auth.updateUser({ data: profile });
    setProfileLoading(false);
    if (error) setProfileMsg({ type: "err", text: error.message });
    else setProfileMsg({ type: "ok", text: "Perfil actualizado correctamente." });
    setTimeout(() => setProfileMsg(null), 4000);
  }

  async function changePassword() {
    setPwdMsg(null);
    if (!newPwd) return setPwdMsg({ type: "err", text: "Escribe la nueva contraseña." });
    if (newPwd.length < 8) return setPwdMsg({ type: "err", text: "Mínimo 8 caracteres." });
    if (newPwd !== confirmPwd) return setPwdMsg({ type: "err", text: "Las contraseñas no coinciden." });
    if (!/[A-Z]/.test(newPwd)) return setPwdMsg({ type: "err", text: "Debe tener al menos una mayúscula." });
    if (!/[0-9]/.test(newPwd)) return setPwdMsg({ type: "err", text: "Debe tener al menos un número." });
    if (!/[^A-Za-z0-9]/.test(newPwd)) return setPwdMsg({ type: "err", text: "Debe tener al menos un carácter especial." });

    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdLoading(false);
    if (error) setPwdMsg({ type: "err", text: error.message });
    else {
      setPwdMsg({ type: "ok", text: "Contraseña actualizada correctamente." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    }
    setTimeout(() => setPwdMsg(null), 5000);
  }

  async function savePreferences() {
    setPrefsMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: { preferences: JSON.stringify(prefs) },
    });
    if (error) setPrefsMsg({ type: "err", text: error.message });
    else setPrefsMsg({ type: "ok", text: "Preferencias guardadas." });
    setTimeout(() => setPrefsMsg(null), 3000);
  }

  async function exportMyData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: clients }, { data: properties }, { data: sims }] = await Promise.all([
      supabase.from("clients").select("*").eq("user_id", user.id),
      supabase.from("properties").select("*").eq("user_id", user.id),
      supabase.from("loan_simulations").select("*").eq("user_id", user.id),
    ]);
    const data = { exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email }, clients, properties, simulations: sims };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `HogarFin_datos_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  }

  async function deleteAllSimulations() {
    if (deleteConfirm !== "ELIMINAR") return;
    setDeleteLoading(true);
    const { data: sims } = await supabase.from("loan_simulations").select("id").eq("user_id", userId);
    if (sims && sims.length > 0) {
      const ids = sims.map(s => s.id);
      await supabase.from("schedule_rows").delete().in("simulation_id", ids);
      await supabase.from("loan_simulations").delete().eq("user_id", userId);
    }
    setDeleteLoading(false);
    setDeleteConfirm("");
    await loadUser();
  }

  const initials = (`${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()) || (email[0]?.toUpperCase() ?? "U");

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] px-4 pb-10 pt-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
          <p className="mt-1 text-sm text-slate-500">Administra tu cuenta y preferencias de HogarFin.</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">

          {/* Sidebar de tabs */}
          <div className="lg:w-52 shrink-0">
            {/* Avatar */}
            <div className="mb-4 flex flex-col items-center rounded-2xl border border-slate-200 bg-white/70 px-4 py-5 shadow-sm text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-2xl font-bold text-white shadow-md">
                {initials}
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900 truncate max-w-full">
                {profile.first_name ? `${profile.first_name} ${profile.last_name}` : email.split("@")[0]}
              </div>
              <div className="text-xs text-slate-500 truncate max-w-full">{email}</div>
              {profile.company && (
                <div className="mt-1 text-xs text-slate-400">{profile.company}</div>
              )}
            </div>

            {/* Tabs */}
            <nav className="space-y-1">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as Tab)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-green-700 ring-1 ring-green-200"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">

            {/* ── PERFIL ── */}
            {tab === "perfil" && (
              <Card title="Información Personal" icon={<User className="h-4 w-4" />}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nombre">
                      <input className={inp} value={profile.first_name}
                        onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                        placeholder="Tu nombre" />
                    </Field>
                    <Field label="Apellido">
                      <input className={inp} value={profile.last_name}
                        onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                        placeholder="Tu apellido" />
                    </Field>
                  </div>

                  <Field label="Correo electrónico">
                    <input className={inp + " bg-slate-50 text-slate-400 cursor-not-allowed"} value={email} disabled />
                    <p className="mt-1 text-xs text-slate-400">El correo no se puede cambiar desde aquí.</p>
                  </Field>

                  <Field label="Teléfono">
                    <input className={inp} value={profile.phone} type="tel"
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="Ej: 987 654 321" />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Empresa / Inmobiliaria">
                      <input className={inp} value={profile.company}
                        onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                        placeholder="Ej: Inmobiliaria Perú SAC" />
                    </Field>
                    <Field label="Cargo / Rol">
                      <select className={sel} value={profile.role}
                        onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}>
                        <option value="">— Selecciona —</option>
                        <option value="asesor">Asesor Inmobiliario</option>
                        <option value="agente">Agente de Ventas</option>
                        <option value="analista">Analista Financiero</option>
                        <option value="gerente">Gerente</option>
                        <option value="estudiante">Estudiante</option>
                        <option value="otro">Otro</option>
                      </select>
                    </Field>
                  </div>

                  {profileMsg && <Msg type={profileMsg.type} text={profileMsg.text} />}

                  <div className="flex justify-end">
                    <button onClick={saveProfile} disabled={profileLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50">
                      <Save className="h-4 w-4" />
                      {profileLoading ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* ── SEGURIDAD ── */}
            {tab === "seguridad" && (
              <div className="space-y-4">
                <Card title="Cambiar Contraseña" icon={<Lock className="h-4 w-4" />}>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.
                    </p>

                    <Field label="Nueva contraseña">
                      <div className="relative">
                        <input
                          className={inp + " pr-10"}
                          type={showPwd ? "text" : "password"}
                          value={newPwd}
                          onChange={e => setNewPwd(e.target.value)}
                          placeholder="Nueva contraseña"
                        />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>

                    <Field label="Confirmar contraseña">
                      <input className={inp} type={showPwd ? "text" : "password"}
                        value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="Repite la contraseña" />
                    </Field>

                    {/* Indicador de fortaleza */}
                    {newPwd && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-600">Fortaleza:</p>
                        <div className="flex gap-1">
                          {[
                            newPwd.length >= 8,
                            /[A-Z]/.test(newPwd),
                            /[0-9]/.test(newPwd),
                            /[^A-Za-z0-9]/.test(newPwd),
                          ].map((ok, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${ok ? "bg-green-500" : "bg-slate-200"}`} />
                          ))}
                        </div>
                        <div className="flex gap-3 text-[10px] text-slate-400">
                          <span className={newPwd.length >= 8 ? "text-green-600" : ""}>8+ chars</span>
                          <span className={/[A-Z]/.test(newPwd) ? "text-green-600" : ""}>Mayúscula</span>
                          <span className={/[0-9]/.test(newPwd) ? "text-green-600" : ""}>Número</span>
                          <span className={/[^A-Za-z0-9]/.test(newPwd) ? "text-green-600" : ""}>Especial</span>
                        </div>
                      </div>
                    )}

                    {pwdMsg && <Msg type={pwdMsg.type} text={pwdMsg.text} />}

                    <div className="flex justify-end">
                      <button onClick={changePassword} disabled={pwdLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50">
                        <Lock className="h-4 w-4" />
                        {pwdLoading ? "Actualizando..." : "Actualizar contraseña"}
                      </button>
                    </div>
                  </div>
                </Card>

                <Card title="Sesión activa" icon={<Shield className="h-4 w-4" />}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Sesión actual</p>
                        <p className="text-xs text-slate-400">{email} · Dispositivo actual</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Activa
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Para cerrar sesión en todos los dispositivos, cambia tu contraseña.
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* ── PREFERENCIAS ── */}
            {tab === "preferencias" && (
              <Card title="Preferencias de Simulación" icon={<Palette className="h-4 w-4" />}>
                <div className="space-y-5">
                  <p className="text-xs text-slate-500">
                    Estos valores se usarán como predeterminados al crear una nueva simulación.
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Moneda predeterminada">
                      <select className={sel} value={prefs.default_currency}
                        onChange={e => setPrefs(p => ({ ...p, default_currency: e.target.value as "PEN" | "USD" }))}>
                        <option value="PEN">PEN (Soles)</option>
                        <option value="USD">USD (Dólares)</option>
                      </select>
                    </Field>

                    <Field label="Plazo predeterminado (años)">
                      <input type="number" min={5} max={25} className={inp}
                        value={prefs.default_term_years}
                        onChange={e => setPrefs(p => ({ ...p, default_term_years: Math.min(25, Math.max(5, Number(e.target.value))) }))} />
                    </Field>

                    <Field label="COK predeterminado (%)">
                      <input type="number" step="0.01" min="0.01" className={inp}
                        value={prefs.default_cok}
                        onChange={e => setPrefs(p => ({ ...p, default_cok: e.target.value }))}
                        placeholder="Ej: 12" />
                    </Field>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Notificaciones</p>
                    <div className="space-y-3">
                      <Toggle
                        label="Confirmar al guardar simulación"
                        sub="Muestra un mensaje cuando una simulación se guarda correctamente."
                        checked={prefs.notifications_sim}
                        onChange={v => setPrefs(p => ({ ...p, notifications_sim: v }))}
                      />
                      <Toggle
                        label="Novedades y actualizaciones"
                        sub="Recibir notificaciones sobre nuevas funciones de HogarFin."
                        checked={prefs.notifications_updates}
                        onChange={v => setPrefs(p => ({ ...p, notifications_updates: v }))}
                      />
                    </div>
                  </div>

                  {prefsMsg && <Msg type={prefsMsg.type} text={prefsMsg.text} />}

                  <div className="flex justify-end">
                    <button onClick={savePreferences}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                      <Save className="h-4 w-4" /> Guardar preferencias
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* ── MIS DATOS ── */}
            {tab === "datos" && (
              <div className="space-y-4">
                <Card title="Resumen de mis datos" icon={<Database className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Clientes",      value: stats.clients },
                      { label: "Inmuebles",     value: stats.properties },
                      { label: "Simulaciones",  value: stats.simulations },
                      { label: "Filas cronograma", value: stats.scheduleRows },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100 text-center">
                        <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                        <div className="text-xs text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Exportar mis datos" icon={<Download className="h-4 w-4" />}>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Descarga todos tus datos (clientes, inmuebles y simulaciones) en formato JSON.
                    </p>
                    <button onClick={exportMyData}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                      <Download className="h-4 w-4 text-green-600" />
                      Descargar mis datos (.json)
                    </button>
                  </div>
                </Card>

                <Card title="Zona de peligro" icon={<Trash2 className="h-4 w-4 text-rose-500" />} danger>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <p className="text-sm font-semibold text-rose-700">Eliminar todas las simulaciones</p>
                      <p className="mt-1 text-xs text-rose-600">
                        Esto borrará permanentemente todas tus simulaciones y cronogramas. Los clientes e inmuebles no se eliminarán.
                        Esta acción <strong>no se puede deshacer</strong>.
                      </p>
                    </div>

                    <Field label='Escribe "ELIMINAR" para confirmar'>
                      <input className={inp} value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                        placeholder="ELIMINAR" />
                    </Field>

                    <button
                      onClick={deleteAllSimulations}
                      disabled={deleteConfirm !== "ELIMINAR" || deleteLoading || stats.simulations === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Trash2 className="h-4 w-4" />
                      {deleteLoading ? "Eliminando..." : `Eliminar ${stats.simulations} simulación${stats.simulations !== 1 ? "es" : ""}`}
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ──
function Card({ title, icon, children, danger }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={`rounded-2xl border shadow-sm backdrop-blur ${danger ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white/70"}`}>
      <div className={`flex items-center gap-2 border-b px-5 py-3.5 ${danger ? "border-rose-100" : "border-slate-100"}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${danger ? "bg-rose-100 text-rose-600" : "bg-green-50 text-green-700"}`}>
          {icon}
        </span>
        <span className={`text-sm font-semibold ${danger ? "text-rose-700" : "text-slate-800"}`}>{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </div>
  );
}

function Msg({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
      type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
    }`}>
      {type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {text}
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}