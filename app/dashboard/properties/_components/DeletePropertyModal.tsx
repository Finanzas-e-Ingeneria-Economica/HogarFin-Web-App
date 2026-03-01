"use client";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export default function DeletePropertyModal({
  open,
  title = "Eliminar propiedad",
  description = "¿Seguro que deseas eliminar esta propiedad? Esta acción no se puede deshacer.",
  onCancel,
  onConfirm,
  loading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => !loading && onCancel()} />

      <div className="relative w-[92vw] max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            onClick={() => !loading && onCancel()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={!!loading}
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            disabled={!!loading}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}