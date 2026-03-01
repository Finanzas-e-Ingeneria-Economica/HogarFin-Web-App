export type Client = { id: number; names: string; last_names: string; dni: string };

export type Property = {
  id: number;
  name: string;
  price: number;
  currency: "PEN" | "USD";
  initial_payment: number;
  location: string;
};

export type Entity = { id: number; name: string };

export type ScheduleRow = {
  period: number;
  balance: number;
  interest: number;
  amort: number;
  basePayment: number;
  desgravamen: number;
  propertyInsurance: number;
  monthlyFees: number;
  totalPayment: number;
  cashflow: number;
  isGrace: boolean;
};

export type SimResults = {
  monthlyPayment: number;
  tem: number;
  tcea: number;
  van: number;
  tirM: number;
  tirA: number;
  schedule: ScheduleRow[];
  principal: number;
  annualRate: number;
  rateType: string;
  currency: "PEN" | "USD";
  exchangeRateUsed: number;
  principalPEN: number;
};