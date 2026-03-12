import { User } from "lucide-react";
import Section from "./Section";
import Field from "./Field";
import Chip from "./Chip";
import type { Client, Property } from "../_utils/types";

const sel =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer";

type Props = {
  clients: Client[];
  properties: Property[];
  selectedClient: number | "";
  setSelectedClient: (id: number | "") => void;
  selectedProperty: number | "";
  setSelectedProperty: (id: number | "") => void;
  propData?: Property;
};

export default function ClientPropertySection({
  clients,
  properties,
  selectedClient,
  setSelectedClient,
  selectedProperty,
  setSelectedProperty,
  propData,
}: Props) {
  return (
    <Section icon={<User className="h-4 w-4" />} title="Cliente e Inmueble">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Cliente">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(Number(e.target.value) || "")}
            className={sel}
          >
            <option value="">— Selecciona un cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.names} {c.last_names} · DNI {c.dni}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Inmueble">
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(Number(e.target.value) || "")}
            className={sel}
          >
            <option value="">— Selecciona un inmueble —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.currency === "USD" ? "$" : "S/"}{" "}
                {p.price.toLocaleString("es-PE")}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {propData && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Chip
            label="Precio"
            value={`${propData.currency === "USD" ? "$" : "S/"} ${new Intl.NumberFormat(
              "es-PE",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ).format(propData.price)}`}
          />
          <Chip
            label="Cuota inicial"
            value={`${propData.currency === "USD" ? "$" : "S/"} ${new Intl.NumberFormat(
              "es-PE",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ).format(propData.initial_payment)}`}
          />
          <Chip label="Moneda" value={propData.currency} />
          <Chip label="Ubicación" value={propData.location} />
        </div>
      )}
    </Section>
  );
}