import type { ScheduleRow } from "./types";

export function calcTEM(rateType: "TEA" | "TNA", annualRate: number, cap: number): number {
  if (rateType === "TEA") return Math.pow(1 + annualRate, 1 / 12) - 1;
  const tea = Math.pow(1 + annualRate / cap, cap) - 1;
  return Math.pow(1 + tea, 1 / 12) - 1;
}

export function calcCuota(p: number, i: number, n: number): number {
  if (n <= 0) return 0;
  if (i === 0) return p / n;
  return (p * i) / (1 - Math.pow(1 + i, -n));
}

export function calcVAN(principal: number, cfs: number[], cokM: number): number {
  return +principal + cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + cokM, t + 1), 0);
}

export function calcTIR(principal: number, cfs: number[]): number {
  const f = (r: number) =>
    principal + cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t + 1), 0);

  let a = 1e-6,
    b = 1;
  if (f(a) * f(b) > 0) return -1;

  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (Math.abs(f(m)) < 1e-7) return m;
    f(a) * f(m) < 0 ? (b = m) : (a = m);
  }
  return (a + b) / 2;
}

export function generateSchedule(
  principal: number,
  tem: number,
  totalMonths: number,
  graceTotal: number,
  gracePartial: number,
  desRate: number,
  propInsAnnual: number,
  propValue: number,
  fees: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let bal = principal;

  for (let i = 1; i <= graceTotal; i++) {
    const interest = bal * tem;
    const des = bal * desRate;
    bal += interest;
    const ins = (propValue * propInsAnnual) / 12;
    const total = des + ins + fees;
    rows.push({
      period: i,
      balance: bal,
      interest,
      amort: 0,
      basePayment: 0,
      desgravamen: des,
      propertyInsurance: ins,
      monthlyFees: fees,
      totalPayment: total,
      cashflow: -total,
      isGrace: true,
    });
  }

  for (let i = graceTotal + 1; i <= graceTotal + gracePartial; i++) {
    const interest = bal * tem;
    const des = bal * desRate;
    const ins = (propValue * propInsAnnual) / 12;
    const total = interest + des + ins + fees;
    rows.push({
      period: i,
      balance: bal,
      interest,
      amort: 0,
      basePayment: interest,
      desgravamen: des,
      propertyInsurance: ins,
      monthlyFees: fees,
      totalPayment: total,
      cashflow: -total,
      isGrace: true,
    });
  }

  const n = Math.max(1, totalMonths - graceTotal - gracePartial);
  const cuota = calcCuota(bal, tem, n);

  for (let i = graceTotal + gracePartial + 1; i <= totalMonths; i++) {
    const interest = bal * tem;
    let amort = cuota - interest;
    if (amort < 0) amort = 0;
    const des = bal * desRate;
    bal = Math.max(0, bal - amort);
    const ins = (propValue * propInsAnnual) / 12;
    const total = cuota + des + ins + fees;

    rows.push({
      period: i,
      balance: bal,
      interest,
      amort,
      basePayment: cuota,
      desgravamen: des,
      propertyInsurance: ins,
      monthlyFees: fees,
      totalPayment: total,
      cashflow: -total,
      isGrace: false,
    });
  }

  return rows;
}