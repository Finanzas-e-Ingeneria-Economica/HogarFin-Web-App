"use client";

import { HomeIcon } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      {/* blobs / gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-200/70 blur-3xl" />
        <div className="absolute top-20 -right-24 h-72 w-72 rounded-full bg-emerald-200/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-lime-200/60 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
            <div />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-sm">
                <HomeIcon className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div className="text-2xl font-bold tracking-tight">HogarFin</div>
            </div>
            <div />
          </div>

          {children}

          <p className="mt-6 text-center text-xs text-zinc-500">
            © {new Date().getFullYear()} HogarFin
          </p>
        </div>
      </div>
    </div>
  );
}