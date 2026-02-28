"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ClientRow = {
  id: number;
  dni: string;
  names: string;
  last_names: string;
  email: string | null;
  phone: string | null;
  residence_location: string | null;
  occupation: string | null;
  income_range: string | null;
  education_level: string | null;
  created_at: string;
};

const INCOME_RANGES = [
  "Menos de S/ 1,500",
  "S/ 1,500 - S/ 2,999",
  "S/ 3,000 - S/ 4,999",
  "S/ 5,000 - S/ 7,999",
  "S/ 8,000 a más",
];

const EDUCATION_LEVELS = [
  "Secundaria",
  "Técnico",
  "Universitario",
  "Postgrado",
];

export default function ClientsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [dni, setDni] = useState("");
  const [names, setNames] = useState("");
  const [lastNames, setLastNames] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [residenceLocation, setResidenceLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [incomeRange, setIncomeRange] = useState(INCOME_RANGES[1]);
  const [educationLevel, setEducationLevel] = useState(EDUCATION_LEVELS[2]);

  const [msg, setMsg] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);

  const loadUserAndClients = async () => {
    setLoading(true);
    setMsg(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      router.push("/login");
      return;
    }

    const uid = userData.user.id;
    setUserId(uid);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) setMsg(error.message);
    setClients((data as ClientRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadUserAndClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logOp = async (action: string, refId?: number) => {
    if (!userId) return;
    await supabase.from("operation_logs").insert({
      user_id: userId,
      action,
      ref_table: "clients",
      ref_id: refId ?? null,
    });
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!userId) return;

    if (!dni || !names || !lastNames) return setMsg("Completa DNI, nombres y apellidos.");
    if (!email) return setMsg("Completa el correo.");
    if (!phone) return setMsg("Completa el teléfono.");
    if (!residenceLocation) return setMsg("Completa distrito/ciudad.");
    if (!occupation) return setMsg("Completa ocupación/situación laboral.");

    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        dni,
        names,
        last_names: lastNames,
        email,
        phone,
        residence_location: residenceLocation,
        occupation,
        income_range: incomeRange,
        education_level: educationLevel,
      })
      .select("id")
      .single();

    if (error) return setMsg(error.message);

    await logOp("CREATE_CLIENT", data.id);

    setDni("");
    setNames("");
    setLastNames("");
    setEmail("");
    setPhone("");
    setResidenceLocation("");
    setOccupation("");
    setIncomeRange(INCOME_RANGES[1]);
    setEducationLevel(EDUCATION_LEVELS[2]);

    await loadUserAndClients();
    setMsg("✅ Cliente creado.");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link className="underline" href="/dashboard">Volver al dashboard</Link>
      </div>

      <form onSubmit={createClient} className="border rounded-xl p-4 space-y-3 max-w-3xl">
        <h2 className="text-lg font-semibold">Nuevo cliente</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm">DNI</label>
            <input className="w-full border rounded-lg p-2" value={dni} onChange={(e) => setDni(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Teléfono</label>
            <input className="w-full border rounded-lg p-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Nombres</label>
            <input className="w-full border rounded-lg p-2" value={names} onChange={(e) => setNames(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Apellidos</label>
            <input className="w-full border rounded-lg p-2" value={lastNames} onChange={(e) => setLastNames(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">Correo</label>
            <input className="w-full border rounded-lg p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">Dirección (Distrito/Ciudad)</label>
            <input className="w-full border rounded-lg p-2" value={residenceLocation} onChange={(e) => setResidenceLocation(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">Ocupación / Situación laboral</label>
            <input className="w-full border rounded-lg p-2" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Rango de ingresos</label>
            <select className="w-full border rounded-lg p-2" value={incomeRange} onChange={(e) => setIncomeRange(e.target.value)}>
              {INCOME_RANGES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Nivel de instrucción</label>
            <select className="w-full border rounded-lg p-2" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {msg && <p className="text-sm">{msg}</p>}

        <button className="bg-black text-white rounded-lg px-4 py-2">Crear cliente</button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Mis clientes</h2>

        {loading ? (
          <p>Cargando...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm">Aún no tienes clientes.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden max-w-4xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">DNI</th>
                  <th className="text-left p-2">Nombre</th>
                  <th className="text-left p-2">Teléfono</th>
                  <th className="text-left p-2">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{c.dni}</td>
                    <td className="p-2">{c.names} {c.last_names}</td>
                    <td className="p-2">{c.phone ?? "-"}</td>
                    <td className="p-2">{c.income_range ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}