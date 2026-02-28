"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientRow } from "../page";

type FormState = {
  dni: string;
  names: string;
  last_names: string;
  email: string;
  phone: string;
  residence_location: string;
  occupation: string;
  income_range: string;
  education_level: string;
  monthly_income: string;
  monthly_expenses: string;
  dependents: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (
    payload: Omit<ClientRow, "id" | "created_at" | "updated_at"> & {
      id?: number;
    },
  ) => Promise<void>;
  saving: boolean;
  initial: ClientRow | null;
  userId: string | null;
};

const incomeRanges = [
  "Menos de S/ 1500",
  "S/ 1500 - S/ 3000",
  "S/ 3000 - S/ 5000",
  "S/ 5000 - S/ 8000",
  "Más de S/ 8000",
];

const educationLevels = ["Secundaria", "Técnico", "Universitario", "Postgrado"];

export default function ClientModal({
  open,
  onClose,
  onSave,
  saving,
  initial,
  userId,
}: Props) {
  const title = initial ? "Editar cliente" : "Nuevo cliente";

  const initialState: FormState = useMemo(
    () => ({
      dni: initial?.dni ?? "",
      names: initial?.names ?? "",
      last_names: initial?.last_names ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      residence_location: initial?.residence_location ?? "",
      occupation: initial?.occupation ?? "",
      income_range: initial?.income_range ?? incomeRanges[0],
      education_level: initial?.education_level ?? educationLevels[0],
      monthly_income:
        initial?.monthly_income !== null &&
        initial?.monthly_income !== undefined
          ? String(initial.monthly_income)
          : "",
      monthly_expenses:
        initial?.monthly_expenses !== undefined
          ? String(initial.monthly_expenses)
          : "0",
      dependents:
        initial?.dependents !== undefined ? String(initial.dependents) : "0",
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

  const set = (k: keyof FormState, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const dni = form.dni.trim();
    if (!dni) return "El DNI es obligatorio";
    if (!/^\d+$/.test(dni)) return "El DNI debe ser numérico";
    if (dni.length !== 8) return "El DNI debe tener 8 dígitos";

    const names = form.names.trim();
    const last = form.last_names.trim();

    if (!names) return "Los nombres son obligatorios";
    if (!last) return "Los apellidos son obligatorios";

    // No números en nombres/apellidos
    const onlyLetters = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s']+$/;
    if (!onlyLetters.test(names))
      return "Los nombres no pueden contener números ni caracteres inválidos";
    if (!onlyLetters.test(last))
      return "Los apellidos no pueden contener números ni caracteres inválidos";

    const email = form.email.trim();
    if (!email) return "El email es obligatorio";
    if (!/^\S+@\S+\.\S+$/.test(email))
      return "El email no tiene un formato válido";

    const phone = form.phone.trim();
    if (!phone) return "El teléfono es obligatorio";
    if (!/^\d+$/.test(phone)) return "El teléfono debe contener solo números";
    if (phone.startsWith("-")) return "El teléfono no puede ser negativo";
    if (phone.length < 6) return "El teléfono parece demasiado corto";

    const residence = form.residence_location.trim();
    if (!residence) return "La residencia es obligatoria";

    const occupation = form.occupation.trim();
    if (!occupation) return "La ocupación es obligatoria";

    if (!form.income_range.trim()) return "El rango de ingresos es obligatorio";
    if (!form.education_level.trim())
      return "El nivel educativo es obligatorio";

    const incomeStr = form.monthly_income.trim();
    if (!incomeStr) return "El ingreso mensual es obligatorio";
    const income = Number(incomeStr);
    if (!Number.isFinite(income) || income < 0)
      return "El ingreso mensual debe ser un número >= 0";

    const expStr = form.monthly_expenses.trim();
    if (!expStr) return "El egreso mensual es obligatorio";
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < 0)
      return "El egreso mensual debe ser un número >= 0";

    const depStr = form.dependents.trim();
    if (!depStr) return "Los dependientes son obligatorios";
    const dep = Number(depStr);
    if (!Number.isFinite(dep) || dep < 0 || !Number.isInteger(dep))
      return "Los dependientes deben ser un entero >= 0";

    if (!userId) return "No se encontró usuario autenticado";

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
      dni: form.dni.trim(),
      names: form.names.trim(),
      last_names: form.last_names.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      residence_location: form.residence_location.trim(),
      occupation: form.occupation.trim(),
      income_range: form.income_range.trim(),
      education_level: form.education_level.trim(),
      monthly_income: Number(form.monthly_income.trim()),
      monthly_expenses: Number(form.monthly_expenses.trim()),
      dependents: Number(form.dependents.trim()),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      <div className="relative w-[95vw] max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">
              {title}
            </div>
            <div className="text-xs text-slate-500">
              Completa todos los campos para guardar al cliente.
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
            <Field label="DNI">
              <input
                value={form.dni}
                onChange={(e) => set("dni", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="00000000"
              />
            </Field>

            <Field label="Teléfono">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="999999999"
              />
            </Field>

            <Field label="Nombres">
              <input
                value={form.names}
                onChange={(e) => set("names", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="Jhon"
              />
            </Field>

            <Field label="Apellidos">
              <input
                value={form.last_names}
                onChange={(e) => set("last_names", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="Doe"
              />
            </Field>

            <Field label="Email" full>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="tu@email.com"
              />
            </Field>

            <Field label="Lugar de residencia" full>
              <input
                value={form.residence_location}
                onChange={(e) => set("residence_location", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="Lima, Perú"
              />
            </Field>

            <Field label="Ocupación" full>
              <input
                value={form.occupation}
                onChange={(e) => set("occupation", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="Ingeniero / Analista / Independiente..."
              />
            </Field>

            <Field label="Ingreso mensual (S/)">
              <input
                value={form.monthly_income}
                onChange={(e) => set("monthly_income", e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="3500"
              />
            </Field>

            <Field label="Egreso mensual (S/)">
              <input
                value={form.monthly_expenses}
                onChange={(e) => set("monthly_expenses", e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="1200"
              />
            </Field>

            <Field label="Dependientes">
              <input
                value={form.dependents}
                onChange={(e) => set("dependents", e.target.value)}
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="0"
              />
            </Field>

            <Field label="Rango de ingresos">
              <select
                value={form.income_range}
                onChange={(e) => set("income_range", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              >
                {incomeRanges.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nivel educativo">
              <select
                value={form.education_level}
                onChange={(e) => set("education_level", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              >
                {educationLevels.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-60"
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
