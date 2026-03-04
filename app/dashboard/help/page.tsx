// app/dashboard/help/page.tsx
import { 
  HelpCircle, 
  BookOpen, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Mail, 
  TrendingUp,
  ShieldCheck,
  Percent
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header con degradado sutil */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-green-600" /> Centro de Ayuda
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Guía técnica y financiera para el uso del simulador HogarFin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Guía de Pasos */}
          <section>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-slate-800">
              <Calculator className="w-5 h-5 text-blue-500" /> Flujo de Simulación
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { step: "1", title: "Datos del Cliente", desc: "Registra ingresos y dependientes. Esto determina la elegibilidad para bonos." },
                { step: "2", title: "Unidad Inmobiliaria", desc: "El sistema valida si el precio califica como Vivienda de Interés Social (VIS)." },
                { step: "3", title: "Ajuste Financiero", desc: "Configura TEA/TNA y periodos de gracia (Total o Parcial)." },
                { step: "4", title: "Análisis de KPIS", desc: "Revisa la TCEA, VAN y TIR antes de presentar al cliente." }
              ].map((item) => (
                <div key={item.step} className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Glosario Avanzado */}
          <section>
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-slate-800">
              <BookOpen className="w-5 h-5 text-green-500" /> Glosario Financiero Detallado
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { 
                  term: "TCEA (Tasa Costo Efectiva Anual)", 
                  desc: "Es el indicador real del costo del préstamo. Incluye la TEA más todos los seguros, comisiones y gastos mensuales." 
                },
                { 
                  term: "Gracia Total vs. Parcial", 
                  desc: "En la Total no pagas nada pero el interés se capitaliza (aumenta la deuda). En la Parcial solo pagas intereses, manteniendo el capital intacto." 
                },
                { 
                  term: "Bono del Buen Pagador (BBP)", 
                  desc: "Subsidio del Estado peruano que no se devuelve. Reduce el monto del préstamo para viviendas de interés social." 
                },
                { 
                  term: "VAN y TIR", 
                  desc: "Indicadores de rentabilidad. El VAN mide el valor actual de los flujos; la TIR es la tasa de retorno del proyecto de inversión." 
                },
                { 
                  term: "Capitalización", 
                  desc: "Ocurre cuando los intereses generados se suman al saldo deudor, haciendo que se generen nuevos intereses sobre intereses." 
                }
              ].map((item, i) => (
                <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-green-200 transition">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-green-600" /> {item.term}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Barra Lateral: Tips, Soporte y Alerta Legal */}
        <div className="space-y-6">
          
          {/* Alerta de Ingeniería (Toque Profesional) */}
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
            <h3 className="flex items-center gap-2 font-bold text-rose-800 mb-2 text-sm uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5" /> Descargo de Responsabilidad
            </h3>
            <p className="text-sm text-rose-700 leading-relaxed">
              Los resultados generados por este simulador son **referenciales** y tienen fines informativos. La aprobación final, tasas y cuotas definitivas dependen de la validación de la entidad financiera seleccionada.
            </p>
          </div>

          {/* Tips de Uso */}
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
            <h3 className="flex items-center gap-2 font-bold text-emerald-800 mb-3">
              <TrendingUp className="w-5 h-5" /> Consejos Técnicos
            </h3>
            <ul className="text-xs text-emerald-800 space-y-3 leading-snug">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> 
                Para proyectos VIS, verifica siempre el rango de ingresos del cliente.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> 
                Utiliza el Historial para comparar diferentes escenarios de tasas.
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              <h3 className="font-bold text-lg">Asistencia</h3>
            </div>
            <p className="text-slate-400 text-sm mb-5">
              Si detectas inconsistencias en el cronograma o el cálculo del Bono Techo Propio, contacta al área de soporte.
            </p>
            <a 
              href="mailto:soporte@hogarfin.com" 
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 transition rounded-xl font-semibold shadow-lg shadow-green-900/20"
            >
              <Mail className="w-4 h-4" /> Enviar Correo
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}