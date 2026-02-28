"use client";

import { Menu } from "lucide-react";

export default function MobileSidebarTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById(
          "open-sidebar"
        ) as HTMLButtonElement | null;
        el?.click();
      }}
      className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 backdrop-blur shadow-sm hover:bg-white"
      aria-label="Abrir menú"
    >
      <Menu className="h-5 w-5 text-zinc-800" />
    </button>
  );
}