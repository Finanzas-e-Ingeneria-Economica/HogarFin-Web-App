"use client";

import { useEffect, useMemo, useState } from "react";
import type { PropertyRow } from "../page";

type FormState = {
  name: string;
  property_type: string;
  currency: "PEN" | "USD";
  price: string;
  initial_payment: string;
  area_m2: string;
  location: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (
    payload: Omit<PropertyRow, "id" | "created_at" | "updated_at"> & { id?: number },
  ) => Promise<void>;
  saving: boolean;
  initial: PropertyRow | null;
  userId: string | null;
};

const types = ["Departamento", "Casa", "Terreno", "Otro"] as const;

const sanitizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length === 1) return parts[0];
  return parts[0] + "." + parts.slice(1).join("").slice(0, 10);
};

const formatWithCommas = (raw: string) => {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decPart !== undefined) return `${intFormatted}.${decPart}`;
  return intFormatted;
};

export default function PropertyModal({
  open,
  onClose,
  onSave,
  saving,
  initial,
  userId,
}: Props) {
  const title = initial ? "Editar propiedad" : "Nueva propiedad";

  const initialState: FormState = useMemo(
    () => ({
      name: initial?.name ?? "",
      property_type: initial?.property_type ?? "Departamento",
      currency: initial?.currency ?? "PEN",
      price: initial?.price !== undefined ? String(initial.price) : "",
      initial_payment:
        initial && initial.initial_payment !== null && initial.initial_payment !== undefined
          ? String(initial.initial_payment)
          : "",
      area_m2: initial?.area_m2 !== undefined ? String(initial.area_m2) : "",
      location: initial?.location ?? "",
    }),
    [initial],
  );

  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialState);
    setError(null);
  }, [initialState, open]);

  if (!open) return null;

  const set = (k: keyof FormState, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const validate = () => {
    if (!userId) return "No se encontró usuario autenticado";

    const name = form.name.trim();
    if (!name) return "El nombre de la propiedad es obligatorio";

    const type = form.property_type.trim();
    if (!type) return "El tipo de propiedad es obligatorio";

    const location = form.location.trim();
    if (!location) return "La ubicación es obligatoria";

    const priceStr = form.price.trim();
    if (!priceStr) return "El precio es obligatorio";
    const price = Number(priceStr);
    if (!Number.isFinite(price) || price <= 0) return "El precio debe ser un número > 0";

    const initStr = form.initial_payment.trim();
    const init = initStr === "" ? 0 : Number(initStr);
    if (!Number.isFinite(init) || init < 0) return "La cuota inicial debe ser un número >= 0";
    if (init > price) return "La cuota inicial no puede ser mayor que el precio";

    const areaStr = form.area_m2.trim();
    if (!areaStr) return "El área (m²) es obligatoria";
    const area = Number(areaStr);
    if (!Number.isFinite(area) || area <= 0) return "El área (m²) debe ser un número > 0";

    const currency = form.currency;
    if (currency !== "PEN" && currency !== "USD") return "Moneda inválida";

    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);

    await onSave({
      id: initial?.id,
      user_id: userId!,
      client_id: null,
      name: form.name.trim(),
      property_type: form.property_type,
      currency: form.currency,
      price: Number(form.price),
      initial_payment: form.initial_payment.trim() === "" ? 0 : Number(form.initial_payment),
      area_m2: Number(form.area_m2),
      location: form.location.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      <div className="relative w-[95vw] max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-500">
              Completa todos los campos para guardar la propiedad.
            </div>
          </div>

          <button
            onClick={() => !saving && onClose()}
            className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre de la propiedad" full>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                placeholder="Ej: Depa Miraflores 65m"
              />
            </Field>

            <Field label="Tipo de propiedad">
              <select
                value={form.property_type}
                onChange={(e) => set("property_type", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Moneda">
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as "PEN" | "USD")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
              >
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>

            <Field label="Precio">
              <input
                value={formatWithCommas(form.price)}
                onChange={(e) => set("price", sanitizeDecimal(e.target.value))}
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                placeholder="100,000"
              />
            </Field>

            <Field label="Cuota inicial">
              <input
                value={formatWithCommas(form.initial_payment)}
                onChange={(e) => set("initial_payment", sanitizeDecimal(e.target.value))}
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                placeholder="Ej: 10,000"
              />
            </Field>

            <Field label="Área (m²)">
              <input
                value={formatWithCommas(form.area_m2)}
                onChange={(e) => set("area_m2", sanitizeDecimal(e.target.value))}
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                placeholder="Ej: 65.5"
              />
            </Field>

            <Field label="Ubicación" full>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                placeholder="Miraflores, Lima"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => !saving && onClose()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </div>
  );
}