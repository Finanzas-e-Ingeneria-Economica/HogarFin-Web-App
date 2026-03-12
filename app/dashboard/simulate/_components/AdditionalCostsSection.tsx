import { DollarSign } from "lucide-react";
import Section from "./Section";
import Field from "./Field";

const inp =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";

type Props = {
  costoNotarial: string;
  setCostoNotarial: (val: string) => void;
  costoRegistral: string;
  setCostoRegistral: (val: string) => void;
  tasacion: string;
  setTasacion: (val: string) => void;
  comisionEstudio: string;
  setComisionEstudio: (val: string) => void;
  comisionActivacion: string;
  setComisionActivacion: (val: string) => void;
  comisionPeriodica: string;
  setComisionPeriodica: (val: string) => void;
  gastosAdmin: string;
  setGastosAdmin: (val: string) => void;
};

export default function AdditionalCostsSection({
  costoNotarial, setCostoNotarial,
  costoRegistral, setCostoRegistral,
  tasacion, setTasacion,
  comisionEstudio, setComisionEstudio,
  comisionActivacion, setComisionActivacion,
  comisionPeriodica, setComisionPeriodica,
  gastosAdmin, setGastosAdmin,
}: Props) {
  return (
    <Section icon={<DollarSign className="h-4 w-4" />} title="Costos y Gastos Adicionales">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Field label="Costos Notariales (S/)">
          <input type="number" min="0" value={costoNotarial} onChange={(e) => setCostoNotarial(e.target.value)} className={inp} placeholder="Ej: 1500" />
        </Field>
        <Field label="Costos Registrales (S/)">
          <input type="number" min="0" value={costoRegistral} onChange={(e) => setCostoRegistral(e.target.value)} className={inp} placeholder="Ej: 900" />
        </Field>
        <Field label="Tasación (S/)">
          <input type="number" min="0" value={tasacion} onChange={(e) => setTasacion(e.target.value)} className={inp} placeholder="Ej: 450" />
        </Field>
        <Field label="Comisión de Estudio (S/)">
          <input type="number" min="0" value={comisionEstudio} onChange={(e) => setComisionEstudio(e.target.value)} className={inp} placeholder="Ej: 250" />
        </Field>
        <Field label="Comisión de Activación (S/)">
          <input type="number" min="0" value={comisionActivacion} onChange={(e) => setComisionActivacion(e.target.value)} className={inp} placeholder="Ej: 300" />
        </Field>
        <Field label="Comisión Periódica (S/mes)">
          <input type="number" min="0" value={comisionPeriodica} onChange={(e) => setComisionPeriodica(e.target.value)} className={inp} placeholder="Ej: 10" />
        </Field>
        <Field label="Gastos Administrativos (S/mes)">
          <input type="number" min="0" value={gastosAdmin} onChange={(e) => setGastosAdmin(e.target.value)} className={inp} placeholder="Ej: 5" />
        </Field>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        * Costos Notariales, Registrales, Tasación, Estudio y Activación son costos iniciales (afectan TCEA/VAN/TIR). Comisión Periódica y Gastos Admin se suman a la cuota mensual.
      </p>
    </Section>
  );
}