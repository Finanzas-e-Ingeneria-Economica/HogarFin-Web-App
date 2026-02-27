"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = {
  id: number;
  names: string;
  last_names: string;
};

type Property = {
  id: number;
  price: number;
  initial_payment: number;
  location: string;
  area_m2: number | null;
  client_id: number;
};

export default function PropertiesPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [price, setPrice] = useState("");
  const [initialPayment, setInitialPayment] = useState("0");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");

  const [msg, setMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const uid = userData.user.id;
    setUserId(uid);

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id,names,last_names")
      .eq("user_id", uid);

    const { data: propertiesData } = await supabase
      .from("properties")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    setClients(clientsData ?? []);
    setProperties(propertiesData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const logOp = async (action: string, refId?: number) => {
    if (!userId) return;
    await supabase.from("operation_logs").insert({
      user_id: userId,
      action,
      ref_table: "properties",
      ref_id: refId ?? null,
    });
  };

  const createProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!userId) return;

    if (!clientId) return setMsg("Selecciona un cliente.");
    if (!price || Number(price) <= 0) return setMsg("Precio inválido.");
    if (Number(initialPayment) < 0) return setMsg("Inicial inválida.");
    if (!location) return setMsg("Ubicación obligatoria.");

    if (Number(initialPayment) > Number(price)) {
      return setMsg("La inicial no puede ser mayor al precio.");
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({
        user_id: userId,
        client_id: Number(clientId),
        price: Number(price),
        initial_payment: Number(initialPayment),
        location,
        area_m2: area ? Number(area) : null,
      })
      .select("id")
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    await logOp("CREATE_PROPERTY", data.id);

    setClientId("");
    setPrice("");
    setInitialPayment("0");
    setLocation("");
    setArea("");

    await loadData();
    setMsg("✅ Propiedad creada.");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Propiedades</h1>
        <Link className="underline" href="/dashboard">
          Volver al dashboard
        </Link>
      </div>

      <form onSubmit={createProperty} className="border rounded-xl p-4 space-y-3 max-w-2xl">
        <h2 className="text-lg font-semibold">Nueva propiedad</h2>

        <div className="space-y-1">
          <label className="text-sm">Cliente</label>
          <select
            className="w-full border rounded-lg p-2"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names} {c.last_names}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm">Precio</label>
            <input
              className="w-full border rounded-lg p-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Inicial</label>
            <input
              className="w-full border rounded-lg p-2"
              value={initialPayment}
              onChange={(e) => setInitialPayment(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">Ubicación</label>
            <input
              className="w-full border rounded-lg p-2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Área (m2)</label>
            <input
              className="w-full border rounded-lg p-2"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
        </div>

        {msg && <p className="text-sm">{msg}</p>}

        <button className="bg-black text-white rounded-lg px-4 py-2">
          Crear propiedad
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Mis propiedades</h2>

        {loading ? (
          <p>Cargando...</p>
        ) : properties.length === 0 ? (
          <p>Aún no tienes propiedades.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden max-w-3xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Precio</th>
                  <th className="text-left p-2">Inicial</th>
                  <th className="text-left p-2">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.price.toFixed(2)}</td>
                    <td className="p-2">{p.initial_payment.toFixed(2)}</td>
                    <td className="p-2">{p.location}</td>
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