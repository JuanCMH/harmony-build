"use client";

import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FORM_LIMITS,
  type FieldType,
  type ReferenceConfig,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";

import { FIELD_CATALOG } from "../lib/field-catalog";

/** Un listado publicado, como lo entrega `forms.listCatalogs`. */
export interface CatalogOption {
  _id: string;
  name: string;
  code?: string;
  titleFieldId?: string;
  fields: { id: string; label: string; type: FieldType }[];
}

/**
 * De qué listado sale una relación y qué datos suyos se traen al elegir un
 * elemento. Lo usan el campo de relación y la columna de relación de una
 * tabla.
 *
 * El título del elemento no se ofrece como dato: ya es lo que se lee en el
 * selector. Los datos se guardan en el orden del listado, que es el orden en
 * que se enseñan debajo del selector.
 */
export const ReferenceConfigFields = ({
  idPrefix,
  value,
  catalogs,
  isLoading,
  onChange,
}: {
  /** Para los `id` de los controles: una tabla pinta uno por columna. */
  idPrefix: string;
  value: ReferenceConfig;
  catalogs: readonly CatalogOption[];
  isLoading: boolean;
  onChange: (value: ReferenceConfig) => void;
}) => {
  const catalog = catalogs.find((candidate) => candidate._id === value.formId);
  const fillable = (catalog?.fields ?? []).filter(
    (field) => field.id !== catalog?.titleFieldId,
  );
  const isAtLimit = value.fill.length >= FORM_LIMITS.maxReferenceFill;

  const toggle = (fieldId: string, checked: boolean) => {
    const chosen = new Set(value.fill);
    if (checked) chosen.add(fieldId);
    else chosen.delete(fieldId);
    onChange({
      ...value,
      fill: fillable.map((field) => field.id).filter((id) => chosen.has(id)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-catalog`}>Listado</Label>
        <SearchableSelect
          id={`${idPrefix}-catalog`}
          className="w-full"
          placeholder={
            isLoading ? "Cargando los listados…" : "Elige un listado"
          }
          searchPlaceholder="Buscar un listado…"
          emptyText="No hay listados publicados en el proyecto."
          value={value.formId}
          options={catalogs.map((candidate) => ({
            value: candidate._id,
            label: candidate.name,
            description: candidate.code,
          }))}
          // Otro listado, otros campos: lo que se traía del anterior no existe
          // en éste.
          onValueChange={(formId) =>
            onChange({
              formId,
              fill: formId === value.formId ? value.fill : [],
            })
          }
        />
        {!isLoading && value.formId !== "" && !catalog ? (
          <p className="text-xs text-destructive">
            El listado elegido ya no está publicado o se eliminó. Elige otro.
          </p>
        ) : !isLoading && catalogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Crea y publica un listado —vehículos, equipos, personas— para poder
            elegir sus elementos aquí.
          </p>
        ) : null}
      </div>

      {catalog ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">Datos que se traen</p>
            <p className="text-xs text-muted-foreground">
              Al elegir un elemento se enseñan debajo, de sólo lectura, y se
              guardan tal como estaban al responder. Hasta{" "}
              {FORM_LIMITS.maxReferenceFill}.
            </p>
          </div>
          {fillable.length === 0 ? (
            <p className="text-ui text-muted-foreground">
              El listado no tiene más campos que su título.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border">
              {fillable.map((field) => {
                const isChecked = value.fill.includes(field.id);
                const Icon = FIELD_CATALOG[field.type].icon;
                const id = `${idPrefix}-fill-${field.id}`;
                return (
                  <li key={field.id}>
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex min-h-10 cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent/30",
                        !isChecked &&
                          isAtLimit &&
                          "cursor-not-allowed opacity-50",
                      )}
                    >
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        disabled={!isChecked && isAtLimit}
                        onCheckedChange={(checked) =>
                          toggle(field.id, checked === true)
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {field.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden />
                        {FIELD_CATALOG[field.type].label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};
