"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  HelpCircle,
  BookOpen,
  AlertTriangle,
  Mail,
  TrendingUp,
  ShieldCheck,
  Percent,
  BadgeCheck,
  Building2,
  Search,
  FileText,
  Target,
  ArrowRight
} from "lucide-react";

const fmtMoney = (v: number) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number, digits = 4) => `${(v * 100).toFixed(digits)}%`;
const toNum = (x: unknown) => {
  const n = typeof x === "string" ? Number(x) : typeof x === "number" ? x : NaN;
  return Number.isFinite(n) ? n : null;
};

function rangeMoney(min: number, max: number | null) {
  const a = `S/ ${fmtMoney(min)}`;
  if (max === null) return `${a}+`;
  return `${a} — S/ ${fmtMoney(max)}`;
}

function rangeTerm(minM: number, maxM: number) {
  const minY = Math.round((minM / 12) * 10) / 10;
  const maxY = Math.round((maxM / 12) * 10) / 10;
  return `${minM}–${maxM} meses (${minY}–${maxY} años)`;
}

const pillBase = "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition shadow-sm";
const cardStyle = "rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden";
const th = "whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200";
const td = "px-4 py-3 text-sm text-slate-700 border-b border-slate-100";

export default function UnifiedHelpPage() {
  const [tab, setTab] = useState<"tp" | "banks" | "glossary">("tp");
  const [entities, setEntities] = useState<any[]>([]);
  const [conds, setConds] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  
  const [price, setPrice] = useState<number>(300000);
  const [termYears, setTermYears] = useState<number>(20);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ents, bc, rt] = await Promise.all([
        supabase.from("financial_entities").select("id,name").order("name"),
        supabase.from("bank_conditions").select("*").eq("is_active", true),
        supabase.from("rate_tiers").select("*").eq("is_active", true),
      ]);
      setEntities(ents.data || []);
      setConds(bc.data || []);
      setTiers(rt.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const applicableTiers = useMemo(() => {
    const entityById = new Map(entities.map(e => [e.id, e.name]));
    const termMonths = termYears * 12;
    const rows = tiers
      .filter(t => t.currency === "PEN")  
      .filter(t => {
        const minP = toNum(t.min_property_value) ?? 0;
        const maxP = toNum(t.max_property_value);
        const okPrice = minP <= price && (maxP === null || maxP >= price);
        const okTerm = t.min_term_months <= termMonths && t.max_term_months >= termMonths;
        return okPrice && okTerm;
      })
      .map(t => {
        const c = conds.find(x => x.entity_id === t.entity_id && x.currency === "PEN");
        const teaMin = toNum(t.tea_min) ?? 0;
        const teaMax = toNum(t.tea_max) ?? 0;

        return {
          entity: entityById.get(t.entity_id) || `Entidad ${t.entity_id}`,
          rangoPrecio: rangeMoney(toNum(t.min_property_value) ?? 0, toNum(t.max_property_value)),
          plazo: rangeTerm(t.min_term_months, t.max_term_months),
          tasa: teaMin === teaMax ? fmtPct(teaMin) : `${fmtPct(teaMin)} — ${fmtPct(teaMax)}`,
          desgravamen: c?.desgravamen_monthly_rate ? fmtPct(toNum(c.desgravamen_monthly_rate) || 0) : "—",
          seguro: c?.property_insurance_annual_rate ? fmtPct(toNum(c.property_insurance_annual_rate) || 0) : "—",
          rateType: t.rate_type,
          cap: t.capitalization_per_year
        };
      });
    return q ? rows.filter(r => r.entity.toLowerCase().includes(q.toLowerCase())) : rows;
  }, [tiers, price, termYears, q, entities, conds]);

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto px-4 pb-12 pt-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-green-600" /> Centro de Ayuda
            </h1>
            <p className="text-slate-500 mt-2">Documentación técnica, validaciones de bonos y parámetros del mercado.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTab("tp")} className={`${pillBase} ${tab === "tp" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-white"}`}>
              <BadgeCheck className="h-4 w-4" /> Techo Propio
            </button>
            <button onClick={() => setTab("banks")} className={`${pillBase} ${tab === "banks" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-white"}`}>
              <Building2 className="h-4 w-4" /> Tasas y Costos
            </button>
            <button onClick={() => setTab("glossary")} className={`${pillBase} ${tab === "glossary" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-white"}`}>
              <BookOpen className="h-4 w-4" /> Ayuda y Glosario
            </button>
          </div>
        </div>

        {tab === "tp" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2">
            <div className={cardStyle + " lg:col-span-2"}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Requisitos y validaciones</div>
                  <div className="text-xs text-slate-500">Resumen de reglas usadas para determinar si el bono aplica.</div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2 font-bold">Validaciones previas</div>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                    <li>El precio de la vivienda debe ser mayor a 0.</li>
                    <li>La cuota inicial no puede ser negativa.</li>
                    <li>Debe existir grupo familiar (dependientes ≥ 1).</li>
                    <li>El tipo de inmueble debe ser Casa o Departamento.</li>
                    <li>El bono no puede hacer que el monto neto a financiar sea menor o igual a 0.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-1 font-bold">VIS Priorizada</div>
                  <p className="text-sm text-slate-600 mb-3">Aplica si el ingreso mensual del hogar es menor o igual a S/ 2,071.</p>
                  <table className="w-full border-separate border-spacing-0 rounded-xl border border-slate-200 overflow-hidden">
                    <thead>
                      <tr><th className={th}>Tipo</th><th className={th}>Precio máximo</th><th className={th}>Bono</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className={td}>Casa</td><td className={td + " text-slate-500"}>S/ 60,000</td><td className={td}>S/ 58,300</td></tr>
                      <tr><td className={td}>Departamento</td><td className={td + " text-slate-500"}>S/ 70,000</td><td className={td}>S/ 53,350</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-1 font-bold">VIS</div>
                  <p className="text-sm text-slate-600 mb-3">Aplica si el ingreso mensual del hogar es menor o igual a S/ 3,715.</p>
                  <table className="w-full border-separate border-spacing-0 rounded-xl border border-slate-200 overflow-hidden">
                    <thead>
                      <tr><th className={th}>Tipo</th><th className={th}>Precio máximo</th><th className={th}>Bono</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className={td}>Casa</td><td className={td + " text-slate-500"}>S/ 109,000</td><td className={td}>S/ 52,250</td></tr>
                      <tr><td className={td}>Departamento</td><td className={td + " text-slate-500"}>S/ 136,000</td><td className={td}>S/ 47,850</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Notas de uso</div>
                  <div className="text-xs text-slate-500">Puntos importantes al evaluar simulaciones.</div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 font-bold">Cuota inicial</div>
                  <p className="mt-1 text-sm text-slate-600">La cuota inicial deberá ser del 10% al 30% del precio de la vivienda.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 font-bold">Moneda</div>
                  <p className="mt-1 text-sm text-slate-600">La evaluación del bono se realiza con el precio de la vivienda expresado en PEN.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 font-bold">Plazo</div>
                  <p className="mt-1 text-sm text-slate-600">El simulador utiliza plazos entre 5 y 25 años (60 a 300 meses).</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900 font-bold">Períodos de gracia</div>
                  <p className="mt-1 text-sm text-slate-600">El total de meses de gracia (total + parcial) no puede exceder 6 meses.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "banks" && (
          <div className={cardStyle + " animate-in fade-in"}>
            <div className="p-6 bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 flex flex-wrap gap-6 items-center justify-between">
              <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-inner min-w-[320px]">
                <Search className="h-5 w-5 text-green-500" />
                <input 
                  placeholder="Buscar entidad financiera..." 
                  className="bg-transparent text-sm outline-none w-full font-medium" 
                  value={q} 
                  onChange={(e)=>setQ(e.target.value)} 
                />
              </div>
              <div className="flex gap-6 items-center bg-white/50 p-2 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Precio Vivienda (S/)</span>
                  <input type="number" value={price} onChange={(e)=>setPrice(Number(e.target.value))} className="w-32 px-3 py-1.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-green-100 outline-none" />
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Plazo (Años)</span>
                  <input type="number" value={termYears} onChange={(e)=>setTermYears(Number(e.target.value))} className="w-20 px-3 py-1.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-green-100 outline-none" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className={th}>Entidad</th>
                    <th className={th}>Rango de Precio</th>
                    <th className={th}>Plazo Permitido</th>
                    <th className={th}>Tasa Referencial</th>
                    <th className={th}>Desgravamen</th>
                    <th className={th}>Seg. Inmueble</th>
                  </tr>
                </thead>
                <tbody>
                  {applicableTiers.length > 0 ? applicableTiers.map((r, i) => (
                    <tr key={i} className="hover:bg-green-50/30 transition-colors group">
                      <td className={td}>
                        <div className="font-bold text-slate-900 group-hover:text-green-700 transition-colors">{r.entity}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{r.rateType} · Cap. {r.cap}</div>
                      </td>
                      <td className={td}><span className="text-xs font-semibold text-slate-500">{r.rangoPrecio}</span></td>
                      <td className={td}><span className="text-xs font-semibold text-slate-500">{r.plazo}</span></td>
                      <td className={td}><span className="text-green-600 font-black text-base">{r.tasa}</span></td>
                      <td className={td}><span className="text-xs font-medium text-slate-500">{r.desgravamen}</span></td>
                      <td className={td}><span className="text-xs font-medium text-slate-500">{r.seguro}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic font-medium">No se encontraron entidades para los filtros seleccionados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "glossary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
            <div className="lg:col-span-2 space-y-10">
              <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                  <Target className="w-7 h-7 text-blue-600" /> Guía de Uso del Simulador
                </h2>
                <div className="space-y-6">
                  {[
                    { s: "1", t: "Gestión de Clientes", d: "Primero, registra al cliente en el dashboard principal con sus ingresos mensuales netos y número de dependientes. Estos datos son críticos para el cálculo automático de los bonos estatales." },
                    { s: "2", t: "Selección de Propiedad", d: "Elige una unidad inmobiliaria. El sistema detectará automáticamente si el precio está dentro de los rangos de Vivienda de Interés Social (VIS) o VIS Priorizada." },
                    { s: "3", t: "Parámetros Bancarios", d: "Selecciona una entidad financiera. Los campos de tasa (TEA/TNA), seguros y comisiones se autocompletarán según los valores de mercado vigentes, pero puedes ajustarlos manualmente." },
                    { s: "4", t: "Análisis y Cronograma", d: "Genera la simulación para visualizar indicadores financieros clave (VAN, TIR, TCEA) y el cronograma completo de pagos bajo el método francés." }
                  ].map((item) => (
                    <div key={item.s} className="flex gap-6 group">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        {item.s}
                      </div>
                      <div className="pt-1">
                        <h3 className="font-bold text-slate-900 text-lg mb-2">{item.t}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                  <Percent className="w-7 h-7 text-green-600" /> Glosario Financiero Técnico
                </h2>
                <div className="grid gap-4">
                  {[
                    { t: "TCEA (Tasa Costo Efectiva Anual)", d: "Es el indicador real del costo del préstamo por año. Incluye no solo los intereses (TEA), sino también los gastos, seguros y comisiones aplicadas por el banco." },
                    { t: "VAN (Valor Actual Neto)", d: "Muestra el valor hoy de los flujos de dinero futuros. Un VAN positivo indica que el financiamiento es económicamente viable bajo el COK seleccionado." },
                    { t: "TIR (Tasa Interna de Retorno)", d: "Representa la rentabilidad real de la operación financiera. Es la tasa que iguala el valor actual de los pagos con el monto del préstamo." },
                    { t: "Capitalización de Intereses", d: "Proceso donde el interés generado y no pagado se suma al capital principal de la deuda, haciendo que el monto deudor crezca para el siguiente periodo." },
                    { t: "Seguro de Desgravamen", d: "Seguro obligatorio en créditos hipotecarios que cancela la deuda pendiente en caso de fallecimiento o invalidez total y permanente del titular." }
                  ].map((item, i) => (
                    <div key={i} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-green-200 transition-all">
                      <h4 className="font-bold text-slate-900 flex items-center gap-3 mb-2">
                        <ArrowRight className="w-4 h-4 text-green-500" /> {item.t}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed pl-7">{item.d}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-rose-50 border border-rose-200 p-7 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                   <AlertTriangle className="w-6 h-6 text-rose-600" />
                   <h3 className="font-bold text-rose-900 text-sm uppercase tracking-tighter">Nota Legal Importante</h3>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed font-medium">
                  Los resultados de este simulador son de carácter **informativo y referencial**. La aprobación del crédito, tasas finales y condiciones definitivas están sujetas a la evaluación crediticia de cada entidad financiera.
                </p>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-600/10 rounded-full blur-3xl group-hover:bg-green-600/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <ShieldCheck className="w-8 h-8 text-green-400" />
                    <h3 className="font-bold text-xl">Soporte</h3>
                  </div>
                  <p className="text-slate-400 text-xs mb-8 leading-relaxed">
                    Si tienes dudas técnicas sobre el cálculo del **Bono del Buen Pagador** o encuentras discrepancias en el cronograma, contáctanos.
                  </p>
                  <a href="mailto:soporte@hogarfin.com" className="flex items-center justify-center gap-3 w-full py-4 bg-green-600 hover:bg-green-500 transition-all rounded-2xl text-sm font-bold shadow-lg shadow-green-900/40">
                    <Mail className="w-4 h-4" /> Enviar Consulta
                  </a>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-7 rounded-3xl">
                <h3 className="flex items-center gap-3 font-bold text-emerald-900 mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-600" /> Tips Técnicos
                </h3>
                <ul className="text-xs text-emerald-700 space-y-4 font-medium">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    Revisa que el precio de la propiedad no exceda los límites VIS para asegurar el bono.
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    El VAN positivo confirma que el costo del préstamo es inferior a tu rentabilidad esperada (COK).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}