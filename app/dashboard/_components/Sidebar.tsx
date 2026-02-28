"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calculator,
  Settings,
  UserCircle2,
  HomeIcon,
} from "lucide-react";

const nav = [
  { href: "/dashboard/board", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/properties", label: "Propiedades", icon: Building2 },
  { href: "/dashboard/simulate", label: "Simulaciones", icon: Calculator },
];

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="border-r border-zinc-200 bg-white/70 backdrop-blur">
      <div className="flex h-18 items-center px-5 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
            <HomeIcon className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div className="text-base font-semibold leading-5 text-zinc-900">
            HogarFin
          </div>
        </div>
      </div>

      <nav className="px-3 py-4 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-gradient-to-r from-indigo-600/10 to-fuchsia-600/10 text-indigo-700 ring-1 ring-indigo-200"
                  : "text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition",
                  active
                    ? "bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 group-hover:bg-indigo-100 group-hover:text-indigo-700",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>

              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200" />

      <div className="px-5 py-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Cuenta
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <UserCircle2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {displayName}
            </div>
            <div className="truncate text-xs text-zinc-500">{email}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert("Configuración (pendiente)")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          <Settings className="h-4 w-4" />
          Configuración
        </button>
      </div>
    </aside>
  );
}
