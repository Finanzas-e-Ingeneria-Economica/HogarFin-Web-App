import { BarChart3 } from "lucide-react";
import Section from "./Section";
import Field from "./Field";
import type { BonoAuto, SubsidyChoice } from "../_utils/subsidies";

const inp =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const sel =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";

type Props = {
  cok: string;
  setCok: (val: string) => void;
  gracePartialMonths: number;
  setGracePartialMonths: (val: number) => void;
  termYears: number;
  subsidyChoice: SubsidyChoice;
  setSubsidyChoice: (val: SubsidyChoice) => void;
  bonoTP: BonoAuto;
  bonoBBP: BonoAuto;
};

export default function EvaluationParamsSection({
  cok, setCok,
  gracePartialMonths, setGracePartialMonths,
  termYears,
  subsidyChoice, setSubsidyChoice,
  bonoTP, bonoBBP
}: Props) {
  return (
    <Section icon={<BarChart3 className="h-4 w-4" />} title="Parámetros de Evaluación">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="COK anual (%)">
          <input type="number" step="0.01" min="0.01" value={cok} onChange={(e) => setCok(e.target.value)} className={inp} placeholder="Ej: 12" />
        </Field>

        <Field label="Gracia Parcial (meses)">
          <input type="number" min={0} max={termYears * 12 - 1} value={gracePartialMonths} onChange={(e) => setGracePartialMonths(Math.max(0, Number(e.target.value) || 0))} className={inp} placeholder="Ej: 0" />
        </Field>

        <Field label="Subsidio a aplicar">
          <select value={subsidyChoice} onChange={(e) => setSubsidyChoice(e.target.value as SubsidyChoice)} className={sel}>
            <option value="NONE">Ninguno</option>
            <option value="TECHO_PROPIO">Techo Propio (BFH)</option>
            <option value="BBP">Bono del Buen Pagador (MiVivienda)</option>
          </select>
        </Field>

        <Field label="Techo Propio">
          <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <div className="font-medium">
              {bonoTP.applies ? `${bonoTP.label} — S/ ${bonoTP.bonus.toLocaleString("es-PE")}` : "No aplica"}
            </div>
            <div className="text-xs text-slate-500">{bonoTP.reason}</div>
          </div>
        </Field>

        <Field label="Bono del Buen Pagador (BBP)">
          <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <div className="font-medium">
              {bonoBBP.applies ? `${bonoBBP.label} — S/ ${bonoBBP.bonus.toLocaleString("es-PE")}` : "No aplica"}
            </div>
            <div className="text-xs text-slate-500">{bonoBBP.reason}</div>
          </div>
        </Field>
      </div>
    </Section>
  );
}