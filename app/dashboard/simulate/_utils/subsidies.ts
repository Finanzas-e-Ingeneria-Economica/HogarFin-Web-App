export type BonoAuto = {
  applies: boolean;
  bonus: number;
  label: string;
  reason: string;
};

export type SubsidyChoice = "NONE" | "TECHO_PROPIO" | "BBP";

export function calcBBP(args: { pricePEN: number; initialPEN: number }): BonoAuto {
  const price = Number(args.pricePEN) || 0;
  const init = Number(args.initialPEN) || 0;

  if (!price || price <= 0)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Precio inválido" };

  if (init < 0)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Cuota inicial inválida" };

  const pct = price > 0 ? init / price : 0;
  if (pct < 0.075) {
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Cuota inicial mínima para MiVivienda + BBP: 7.5%",
    };
  }

  const tiers = [
    { min: 68800, max: 98100, bonus: 27400 },
    { min: 98100, max: 146900, bonus: 22800 },
    { min: 146900, max: 244600, bonus: 20900 },
    { min: 244600, max: 362800, bonus: 7800 },
    { min: 362800, max: 488800, bonus: 0 },
  ];

  const row = tiers.find((t) => price >= t.min && price <= t.max);

  if (!row) {
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "Precio fuera del rango del Nuevo Crédito MiVivienda (para BBP).",
    };
  }

  if (row.bonus <= 0) {
    return { applies: false, bonus: 0, label: "No aplica", reason: "En este rango de precio no aplica BBP." };
  }

  const financed = price - init - row.bonus;
  if (financed <= 0) {
    return {
      applies: false,
      bonus: 0,
      label: "No aplica",
      reason: "El valor de la vivienda (menos cuota inicial) no puede ser menor o igual al bono.",
    };
  }

  return {
    applies: true,
    bonus: row.bonus,
    label: "Bono del Buen Pagador (Tradicional)",
    reason: "Califica",
  };
}

export function calcTechoPropioAVN(args: {
  monthlyIncome: number;
  dependents: number;
  propertyType: string;
  pricePEN: number;
  initialPEN: number;
}): BonoAuto {
  const income = Number(args.monthlyIncome) || 0;
  const deps = Number(args.dependents) || 0;
  const ptype = String(args.propertyType || "");
  const price = Number(args.pricePEN) || 0;
  const init = Number(args.initialPEN) || 0;

  if (!price || price <= 0)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Precio inválido" };

  if (init < 0)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Cuota inicial inválida" };

  if (deps < 1)
    return { applies: false, bonus: 0, label: "No aplica", reason: "Sin grupo familiar (dependientes)" };

  if (!["Casa", "Departamento"].includes(ptype))
    return { applies: false, bonus: 0, label: "No aplica", reason: "Tipo de inmueble no válido (solo Casa o Departamento)" };

  let candidate: BonoAuto = { applies: false, bonus: 0, label: "No aplica", reason: "Precio fuera del rango VIS" };

  if (income <= 2071) {
    if (ptype === "Casa" && price <= 60000) {
      candidate = { applies: true, bonus: 58300, label: "Techo Propio (VIS Priorizada)", reason: "Califica" };
    }
    if (ptype === "Departamento" && price <= 70000) {
      candidate = { applies: true, bonus: 53350, label: "Techo Propio (VIS Priorizada)", reason: "Califica" };
    }
  }

  if (!candidate.applies) {
    if (income > 3715) {
      return { applies: false, bonus: 0, label: "No aplica", reason: "Ingreso > 3,715" };
    }

    if (ptype === "Casa" && price <= 109000) {
      candidate = { applies: true, bonus: 52250, label: "Techo Propio (VIS)", reason: "Califica" };
    }
    if (ptype === "Departamento" && price <= 136000) {
      candidate = { applies: true, bonus: 47850, label: "Techo Propio (VIS)", reason: "Califica" };
    }
  }

  if (candidate.applies) {
    const financed = price - init - candidate.bonus;
    if (financed <= 0) {
      return { applies: false, bonus: 0, label: "No aplica", reason: "El valor de la vivienda (menos cuota inicial) no puede ser menor o igual al bono." };
    }
  }

  return candidate;
}