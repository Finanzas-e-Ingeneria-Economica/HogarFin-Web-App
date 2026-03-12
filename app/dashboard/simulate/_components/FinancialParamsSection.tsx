import { TrendingUp, Zap, CheckCircle2 } from "lucide-react";
import Section from "./Section";
import Field from "./Field";
import type { Entity } from "../_utils/types";

const inp =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100";
const sel =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";

type Props = {
  entities: Entity[];
  selectedEntity: number | "";
  onEntityChange: (id: number | "") => void;
  bankLoading: boolean;
  bankLoaded: boolean;
  entityData?: Entity;
  
  termYears: number;
  setTermYears: (val: number) => void;
  rateType: "TEA" | "TNA";
  setRateType: (val: "TEA" | "TNA") => void;
  annualRate: string;
  setAnnualRate: (val: string) => void;
  capPerYear: number;
  setCapPerYear: (val: number) => void;
  desgravamen: string;
  setDesgravamen: (val: string) => void;
  propInsurance: string;
  setPropInsurance: (val: string) => void;
  portesMensual: string;
  setPortesMensual: (val: string) => void;
  graceTotalMonths: number;
  setGraceTotalMonths: (val: number) => void;
};

export default function FinancialParamsSection({
  entities,
  selectedEntity,
  onEntityChange,
  bankLoading,
  bankLoaded,
  entityData,
  termYears,
  setTermYears,
  rateType,
  setRateType,
  annualRate,
  setAnnualRate,
  capPerYear,
  setCapPerYear,
  desgravamen,
  setDesgravamen,
  propInsurance,
  setPropInsurance,
  portesMensual,
  setPortesMensual,
  graceTotalMonths,
  setGraceTotalMonths,
}: Props) {
  return (
    <Section icon={<TrendingUp className="h-4 w-4" />} title="Parámetros Financieros">
      <div className="mb-4">
        <Field label="Entidad Financiera">
          <div className="flex items-center gap-2">
            <select
              value={selectedEntity}
              onChange={(e) => onEntityChange(Number(e.target.value) || "")}
              className={sel + " flex-1"}
            >
              <option value="">— Selecciona banco —</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            {bankLoading && (
              <span className="shrink-0 animate-pulse text-xs text-slate-400">
                Cargando...
              </span>
            )}

            {bankLoaded && !bankLoading && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                <Zap className="h-3 w-3" /> Datos cargados
              </span>
            )}
          </div>
        </Field>
      </div>

      {bankLoaded && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Los parámetros de <strong>{entityData?.name}</strong> fueron autocompletados. Puedes editarlos si es necesario.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Plazo (años)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={25}
              value={termYears}
              onChange={(e) => setTermYears(Math.min(25, Math.max(5, Number(e.target.value) || 5)))}
              className={inp}
            />
            <span className="shrink-0 text-xs text-slate-500">
              {termYears * 12} meses
            </span>
          </div>
        </Field>

        <Field label="Tipo de Tasa">
          <select
            value={rateType}
            onChange={(e) => setRateType(e.target.value as "TEA" | "TNA")}
            className={sel}
          >
            <option value="TEA">Efectiva Anual (TEA)</option>
            <option value="TNA">Nominal Anual (TNA)</option>
          </select>
        </Field>

        <Field label={`Interés ${rateType} (%)`}>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            max="99"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            className={inp}
            placeholder="Ej: 12.0000"
          />
        </Field>

        {rateType === "TNA" && (
          <Field label="Capitalización (veces/año)">
            <select
              value={capPerYear}
              onChange={(e) => setCapPerYear(Number(e.target.value))}
              className={sel}
            >
              <option value={1}>Anual (1)</option>
              <option value={2}>Semestral (2)</option>
              <option value={4}>Trimestral (4)</option>
              <option value={6}>Bimestral (6)</option>
              <option value={12}>Mensual (12)</option>
              <option value={24}>Quincenal (24)</option>
              <option value={360}>Diaria (360)</option>
            </select>
          </Field>
        )}

        <Field label="Seg. Desgravamen mensual (%)">
          <input
            type="number"
            step="0.0001"
            min="0"
            value={desgravamen}
            onChange={(e) => setDesgravamen(e.target.value)}
            className={inp}
            placeholder="Ej: 0.0350"
          />
        </Field>

        <Field label="Seg. Inmueble anual (%)">
          <input
            type="number"
            step="0.0001"
            min="0"
            value={propInsurance}
            onChange={(e) => setPropInsurance(e.target.value)}
            className={inp}
            placeholder="Ej: 0.0300"
          />
        </Field>

        <Field label="Portes Mensual (S/)">
          <input
            type="number"
            min="0"
            value={portesMensual}
            onChange={(e) => setPortesMensual(e.target.value)}
            className={inp}
            placeholder="Ej: 0.00"
          />
        </Field>

        <Field label="Gracia Total (meses)">
          <input
            type="number"
            min={0}
            max={termYears * 12 - 1}
            value={graceTotalMonths}
            onChange={(e) => setGraceTotalMonths(Math.max(0, Number(e.target.value) || 0))}
            className={inp}
            placeholder="Ej: 0"
          />
        </Field>
      </div>
    </Section>
  );
}