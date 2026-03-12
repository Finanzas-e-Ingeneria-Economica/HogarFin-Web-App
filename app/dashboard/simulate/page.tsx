"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, History, Calculator } from "lucide-react";

import { useSimulationData } from "./_hooks/useSimulationData";
import { useSimulationLogic } from "./_hooks/useSimulationLogic";

import ClientPropertySection from "./_components/ClientPropertySection";
import FinancialParamsSection from "./_components/FinancialParamsSection";
import AdditionalCostsSection from "./_components/AdditionalCostsSection";
import EvaluationParamsSection from "./_components/EvaluationParamsSection";
import ResultsBlock from "./_components/ResultsBlock";

export default function SimulatePage() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  // 1. Carga de datos base (Supabase)
  const { userId, clients, properties, getUsdPenRate } = useSimulationData();

  // 2. Lógica y Estado de Simulación
  const logic = useSimulationLogic(userId, clients, properties, getUsdPenRate);

  // Desplazamiento automático cuando hay resultados
  if (logic.results && resultsRef.current) {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Nueva Simulación</h1>
            <p className="mt-1 text-sm text-slate-500">
              Crédito MiVivienda — Método Francés Vencido Ordinario
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/simulate/history")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <History className="h-4 w-4 text-green-600" />
            Ver Historial
          </button>
        </div>

        {/* Error Alert */}
        {logic.error && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {logic.error}
          </div>
        )}

        {/* CONTENEDOR DE LAS SECCIONES */}
        <div className="mt-5 space-y-5">
          <ClientPropertySection
            clients={clients} properties={properties}
            selectedClient={logic.selectedClient} setSelectedClient={logic.setSelectedClient}
            selectedProperty={logic.selectedProperty} setSelectedProperty={logic.setSelectedProperty}
            propData={logic.propData}
          />

          <FinancialParamsSection
            entities={logic.entities} selectedEntity={logic.selectedEntity} onEntityChange={logic.onEntityChange}
            bankLoading={logic.bankLoading} bankLoaded={logic.bankLoaded} entityData={logic.entityData}
            termYears={logic.termYears} setTermYears={logic.setTermYears}
            rateType={logic.rateType} setRateType={logic.setRateType}
            annualRate={logic.annualRate} setAnnualRate={logic.setAnnualRate}
            capPerYear={logic.capPerYear} setCapPerYear={logic.setCapPerYear}
            desgravamen={logic.desgravamen} setDesgravamen={logic.setDesgravamen}
            propInsurance={logic.propInsurance} setPropInsurance={logic.setPropInsurance}
            portesMensual={logic.portesMensual} setPortesMensual={logic.setPortesMensual}
            graceTotalMonths={logic.graceTotalMonths} setGraceTotalMonths={logic.setGraceTotalMonths}
          />

          <AdditionalCostsSection
            costoNotarial={logic.costoNotarial} setCostoNotarial={logic.setCostoNotarial}
            costoRegistral={logic.costoRegistral} setCostoRegistral={logic.setCostoRegistral}
            tasacion={logic.tasacion} setTasacion={logic.setTasacion}
            comisionEstudio={logic.comisionEstudio} setComisionEstudio={logic.setComisionEstudio}
            comisionActivacion={logic.comisionActivacion} setComisionActivacion={logic.setComisionActivacion}
            comisionPeriodica={logic.comisionPeriodica} setComisionPeriodica={logic.setComisionPeriodica}
            gastosAdmin={logic.gastosAdmin} setGastosAdmin={logic.setGastosAdmin}
          />

          <EvaluationParamsSection
            cok={logic.cok} setCok={logic.setCok}
            gracePartialMonths={logic.gracePartialMonths} setGracePartialMonths={logic.setGracePartialMonths}
            termYears={logic.termYears}
            subsidyChoice={logic.subsidyChoice} setSubsidyChoice={logic.setSubsidyChoice}
            bonoTP={logic.bonoTP} bonoBBP={logic.bonoBBP}
          />
        </div> 

        {/* Botón de Calcular */}
        <div className="flex justify-end pb-2 mt-5">
          <button
            onClick={logic.runSimulation}
            disabled={logic.loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" />
            {logic.loading ? "Calculando..." : "Calcular Simulación"}
          </button>
        </div>

        {/* Resultados */}
        {logic.results && (
          <div ref={resultsRef} className="pt-1">
            <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
              <ResultsBlock
                results={logic.results} saved={logic.saved}
                termYears={logic.termYears} rateType={logic.rateType}
                annualRate={logic.annualRate} cok={logic.cok}
                graceTotalMonths={logic.graceTotalMonths} gracePartialMonths={logic.gracePartialMonths}
                entityData={logic.entityData} clientData={logic.clientData}
                propData={logic.propData}
                showSchedule={logic.showSchedule} setShowSchedule={logic.setShowSchedule}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}