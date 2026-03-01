export default function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-700">
          {icon}
        </span>
        <span className="text-sm font-semibold text-slate-800">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}