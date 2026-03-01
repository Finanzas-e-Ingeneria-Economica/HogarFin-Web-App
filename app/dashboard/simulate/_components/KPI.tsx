const colors: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  orange: "bg-amber-50 text-amber-700 ring-amber-200",
};

export default function KPI({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-3.5 ring-1 ${colors[color] ?? colors.green}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-base font-bold leading-tight">{value}</div>
      <div className="mt-0.5 text-xs opacity-70">{sub}</div>
    </div>
  );
}