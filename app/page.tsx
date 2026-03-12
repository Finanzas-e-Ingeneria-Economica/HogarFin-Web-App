import Link from 'next/link';
import { 
  ShieldCheck, Calculator, Home, BarChart3, ChevronRight, 
  CheckCircle2, Users, Building2, TrendingUp, HelpCircle,
  ArrowRight, MousePointer2, Smartphone, Globe
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 flex items-center justify-between px-8 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-700 p-2 rounded-lg">
            <Home className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-emerald-900">HogarFin</span>
        </div>
        <div className="hidden md:flex gap-10 text-sm font-bold text-slate-700">
          <a href="#beneficios" className="hover:text-emerald-700 transition-colors">Beneficios</a>
          <a href="#proceso" className="hover:text-emerald-700 transition-colors">Proceso</a>
          <a href="#faq" className="hover:text-emerald-700 transition-colors">Preguntas</a>
        </div>
        <div className="flex gap-4">
          <Link href="/auth/login" className="px-6 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition-all">
            Ingresar
          </Link>
          <Link href="/auth/register" className="px-6 py-2.5 text-sm font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-all shadow-md shadow-emerald-100">
            Crear Cuenta
          </Link>
        </div>
      </nav>

      <section className="relative px-8 py-24 lg:py-32 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-sm font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
            <TrendingUp size={16} /> Software Financiero de Alto Impacto
          </div>
          <h1 className="text-6xl lg:text-7xl font-black leading-[1.05] text-slate-900 mb-8">
            Domina el crédito <br />
            <span className="text-emerald-700">MiVivienda</span> con precisión.
          </h1>
          <p className="text-xl text-slate-700 mb-10 leading-relaxed max-w-xl">
            La plataforma líder para inmobiliarias que buscan automatizar cronogramas de pago, calcular VAN/TIR y gestionar bonos estatales con transparencia total.
          </p>
          <div className="flex flex-col sm:flex-row gap-5">
            <Link href="/auth/register" className="group flex items-center justify-center gap-3 px-10 py-5 bg-emerald-700 text-white font-black text-lg rounded-2xl hover:bg-emerald-800 transition-all shadow-2xl shadow-emerald-200">
              Empezar ahora <ArrowRight className="group-hover:translate-x-2 transition-transform" size={22} />
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-2 bg-emerald-500 rounded-3xl blur-3xl opacity-10"></div>
          <div className="relative bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-800">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <p className="text-emerald-400 font-bold mb-2">Cuota Método Francés</p>
                <p className="text-4xl font-black text-white leading-none">S/ 1,693.81</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-900/30 p-5 rounded-2xl border border-emerald-800/50">
                  <p className="text-xs text-emerald-300 font-bold uppercase tracking-widest">TIR Mensual</p>
                  <p className="text-xl font-black text-white">0.95%</p>
                </div>
                <div className="bg-emerald-900/30 p-5 rounded-2xl border border-emerald-800/50">
                  <p className="text-xs text-emerald-300 font-bold uppercase tracking-widest">VAN Proyecto</p>
                  <p className="text-xl font-black text-white">S/ 4,200.50</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="proceso" className="py-28 px-8 border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tight text-center">Tu flujo de trabajo en 4 pasos</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto text-center">
            Interfaz intuitiva diseñada para guiar al asesor inmobiliario desde el primer contacto hasta el cierre financiero.
          </p>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          <BigStep 
            number="1" 
            title="Autenticación Segura" 
            desc="Acceso mediante credenciales encriptadas para garantizar la integridad de la base de datos." 
            icon={<ShieldCheck size={40} />}
          />
          <BigStep 
            number="2" 
            title="Perfil del Cliente" 
            desc="Registro de datos socioeconómicos y unidad inmobiliaria de interés para la simulación." 
            icon={<Users size={40} />}
          />
          <BigStep 
            number="3" 
            title="Cálculo Algorítmico" 
            desc="Configuración de tasas (TEA/TNA) y aplicación del Bono Techo Propio automáticamente." 
            icon={<Calculator size={40} />}
          />
          <BigStep 
            number="4" 
            title="Reporte de Impacto" 
            desc="Generación de cronograma detallado con indicadores financieros SBS (VAN/TIR)." 
            icon={<BarChart3 size={40} />}
          />
        </div>
      </section>

      <section id="beneficios" className="py-28 px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1">
            <h2 className="text-4xl font-black text-slate-900 mb-6">Potencia tu gestión inmobiliaria</h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Herramientas diseñadas para cerrar ventas con datos reales y sustento técnico inigualable.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 font-bold text-emerald-700">
                <CheckCircle2 /> Cumplimiento Normativo SBS
              </div>
              <div className="flex items-center gap-3 font-bold text-emerald-700">
                <CheckCircle2 /> Gestión de 18 Entidades
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
            <FixedFeatureCard 
              title="Cálculo en Divisas" 
              desc="Simulaciones en Soles y Dólares con tipos de cambio variables." 
              icon={<Globe size={28} />}
            />
            <FixedFeatureCard 
              title="Periodos de Gracia" 
              desc="Modelado de gracia total o parcial con capitalización automática." 
              icon={<MousePointer2 size={28} />}
            />
            <FixedFeatureCard 
              title="Fórmulas Especializadas" 
              desc="Implementación exacta del Método Francés Vencido Ordinario (30 días)." 
              icon={<Building2 size={28} />}
            />
            <FixedFeatureCard 
              title="Multi-Plataforma" 
              desc="Diseño responsive ideal para tablets en casetas de venta o desktops corporativas." 
              icon={<Smartphone size={28} />}
            />
          </div>
        </div>
      </section>

      <section id="faq" className="py-28 px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4 text-center">Resolviendo tus dudas</h2>
          <p className="text-lg text-slate-600 text-center">Información clave sobre el cálculo del crédito hipotecario.</p>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          <NewFAQ 
            q="¿Cómo afecta el Bono Techo Propio al financiamiento?" 
            a="Se aplica como una reducción directa al capital neto financiado después de la cuota inicial, disminuyendo la cuota mensual." 
          />
          <NewFAQ 
            q="¿Qué diferencia hay entre gracia total y parcial?" 
            a="En gracia total no se paga capital ni interés (se capitalizan); en parcial se pagan solo intereses mensualmente." 
          />
          <NewFAQ 
            q="¿El sistema calcula la TCEA automáticamente?" 
            a="Sí, integramos intereses, comisiones y seguros para mostrar el costo efectivo real anual del crédito." 
          />
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-16 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
          <div className="col-span-2 text-left">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-emerald-700 p-2 rounded-lg text-white">
                <Home size={24} />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter">HogarFin</span>
            </div>
            <p className="max-w-sm text-lg text-left">
              Optimización financiera para el sector inmobiliario peruano.
            </p>
          </div>
          <div className="text-left">
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-sm text-left">Explorar</h4>
            <ul className="space-y-4 font-bold text-left">
              <li><a href="#" className="hover:text-emerald-500 transition">Inicio</a></li>
              <li><a href="#beneficios" className="hover:text-emerald-500 transition">Funciones</a></li>
              <li><a href="/auth/register" className="hover:text-emerald-500 transition">Registro</a></li>
            </ul>
          </div>
          <div className="text-left">
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-sm text-left">Legal</h4>
            <ul className="space-y-4 font-bold text-left">
              <li>UPC - Ingeniería de Software y Sistemas</li>
              <li>Finanzas e Ingeniería Económica</li>
              <li>Ciclo 2026-0</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold">© 2026 HogarFin.</p>
          <div className="flex gap-6">
            <Link href="/auth/login" className="text-xs hover:text-white uppercase font-black">Login Asesores</Link>
            <Link href="/auth/register" className="text-xs hover:text-white uppercase font-black">Registro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface BigStepProps {
  number: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

function BigStep({ number, title, desc, icon }: BigStepProps) {
  return (
    <div className="relative p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group text-left">
      <div className="text-7xl font-black text-slate-100 absolute top-4 right-6 group-hover:text-emerald-50 transition-colors">{number}</div>
      <div className="relative z-10 text-emerald-700 mb-6">{icon}</div>
      <h3 className="relative z-10 text-2xl font-black text-slate-900 mb-4 text-left">{title}</h3>
      <p className="relative z-10 text-slate-600 font-medium leading-relaxed text-left">{desc}</p>
    </div>
  );
}

interface FixedFeatureCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

function FixedFeatureCard({ title, desc, icon }: FixedFeatureCardProps) {
  return (
    <div className="group p-8 bg-white border border-slate-100 rounded-[2rem] hover:bg-emerald-700 transition-all duration-300 text-left">
      <div className="mb-6 w-14 h-14 bg-emerald-50 text-emerald-700 flex items-center justify-center rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors border border-emerald-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-900 group-hover:text-white transition-colors text-left">{title}</h3>
      <p className="text-slate-600 group-hover:text-emerald-50 transition-colors font-medium leading-relaxed text-left">{desc}</p>
    </div>
  );
}

interface NewFAQProps {
  q: string;
  a: string;
}

function NewFAQ({ q, a }: NewFAQProps) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors shadow-sm text-left">
      <h4 className="flex items-center gap-4 text-xl font-black text-slate-900 mb-4 text-left">
        <HelpCircle className="text-emerald-600" size={24} /> {q}
      </h4>
      <p className="text-slate-600 font-medium leading-relaxed ml-10 italic text-left">"{a}"</p>
    </div>
  );
}