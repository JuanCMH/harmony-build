"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FIELD_TYPE_KINDS,
  FORM_LIMITS,
  type FormKind,
  TABLE_COLUMN_TYPES,
  type TableColumn,
  type TableColumnType,
  type TableConfig,
} from "@/convex/lib/form_types";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { moveItem } from "../lib/checklist-editing";
import { FIELD_CATALOG } from "../lib/field-catalog";
import { parseOptionalNumber } from "../lib/field-config-text";
import { columnTypeConfig, newTableColumn } from "../lib/field-defaults";
import { FormOptionsEditor } from "./form-options-editor";
import { type CatalogOption, ReferenceConfigFields } from "./reference-config";

const ColumnCard = ({
  column,
  index,
  count,
  kind,
  catalogs,
  isLoadingCatalogs,
  onChange,
  onMove,
  onRemove,
}: {
  column: TableColumn;
  index: number;
  count: number;
  kind: FormKind;
  catalogs: readonly CatalogOption[];
  isLoadingCatalogs: boolean;
  onChange: (column: TableColumn) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) => {
  const name = column.label || `Columna ${index + 1}`;
  const types = TABLE_COLUMN_TYPES.filter(
    // Una firma por fila es una firma: tampoco cabe en un listado.
    (type) => FIELD_TYPE_KINDS[type]?.includes(kind) ?? true,
  );

  const changeType = (type: TableColumnType) => {
    // Lo propio del tipo anterior —opciones, relación— sobra en el nuevo, y
    // `validateTableConfig` lo rechaza tanto como lo que falta.
    const { options: _options, reference: _reference, ...rest } = column;
    onChange({ ...rest, type, ...columnTypeConfig(type) });
  };

  return (
    <li className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <Label
            htmlFor={`column-${column.id}-label`}
            className="text-xs font-normal text-muted-foreground"
          >
            Nombre
          </Label>
          <Input
            id={`column-${column.id}-label`}
            className="h-8"
            value={column.label}
            placeholder={`Columna ${index + 1}`}
            onChange={(event) =>
              onChange({ ...column, label: event.target.value })
            }
          />
        </div>
        <div className="w-40 space-y-1">
          <Label
            htmlFor={`column-${column.id}-type`}
            className="text-xs font-normal text-muted-foreground"
          >
            Tipo
          </Label>
          <Select
            value={column.type}
            onValueChange={(type) => changeType(type as TableColumnType)}
          >
            <SelectTrigger
              id={`column-${column.id}-type`}
              size="sm"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => {
                const { icon: Icon, label } = FIELD_CATALOG[type];
                return (
                  <SelectItem key={type} value={type}>
                    <Icon className="size-4" />
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <Switch
            checked={column.required}
            onCheckedChange={(checked) =>
              onChange({ ...column, required: checked })
            }
          />
          Obligatoria
        </label>
        <div className="ml-auto flex items-center">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground"
            aria-label={`Subir ${name}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground"
            aria-label={`Bajar ${name}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`Quitar ${name}`}
            disabled={count <= 1}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {column.type === "select" ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">Opciones</p>
          <FormOptionsEditor
            options={column.options ?? []}
            labelPrefix={`Opción de ${name}`}
            onChange={(options) => onChange({ ...column, options })}
          />
        </div>
      ) : null}

      {column.type === "reference" ? (
        <div className="border-t pt-3">
          <ReferenceConfigFields
            idPrefix={`column-${column.id}`}
            value={column.reference ?? { formId: "", fill: [] }}
            catalogs={catalogs}
            isLoading={isLoadingCatalogs}
            onChange={(reference) => onChange({ ...column, reference })}
          />
        </div>
      ) : null}
    </li>
  );
};

/**
 * Las columnas de una tabla y cuántas filas admite.
 *
 * Cada columna es un campo escalar —texto, número, fecha, lista, casilla,
 * relación, imagen o firma—: sin tablas ni listas de chequeo dentro
 * (diseño §4.3). El orden de las columnas es el de la tabla al diligenciar.
 */
export const TableEditor = ({
  config,
  kind,
  catalogs,
  isLoadingCatalogs,
  onChange,
}: {
  config: TableConfig;
  kind: FormKind;
  catalogs: readonly CatalogOption[];
  isLoadingCatalogs: boolean;
  onChange: (config: TableConfig) => void;
}) => {
  const columns = config.columns;
  const setColumns = (next: TableColumn[]) =>
    onChange({ ...config, columns: next });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium tracking-tight">Filas</h3>
          <p className="text-xs text-muted-foreground">
            Quien diligencia añade las que necesite. Sin mínimo, la tabla puede
            quedar vacía; sin máximo, admite hasta {FORM_LIMITS.maxTableRows}.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="table-row-label">Cada fila es</Label>
            <Input
              id="table-row-label"
              placeholder="Ej.: Elemento entregado"
              value={config.rowLabel}
              onChange={(event) =>
                onChange({ ...config, rowLabel: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-min-rows">Mínimo de filas</Label>
            <Input
              id="table-min-rows"
              type="number"
              inputMode="numeric"
              min={0}
              max={FORM_LIMITS.maxTableRows}
              placeholder="Sin mínimo"
              value={config.minRows ?? ""}
              onChange={(event) =>
                onChange({
                  ...config,
                  minRows: parseOptionalNumber(event.target.value, true),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-max-rows">Máximo de filas</Label>
            <Input
              id="table-max-rows"
              type="number"
              inputMode="numeric"
              min={1}
              max={FORM_LIMITS.maxTableRows}
              placeholder="Sin máximo"
              value={config.maxRows ?? ""}
              onChange={(event) =>
                onChange({
                  ...config,
                  maxRows: parseOptionalNumber(event.target.value, true),
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium tracking-tight">
            Columnas{" "}
            <span className="font-normal text-muted-foreground tabular-nums">
              {columns.length} de {FORM_LIMITS.maxTableColumns}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            En el teléfono cada fila es una tarjeta con sus columnas apiladas;
            en escritorio, una tabla con una columna por campo.
          </p>
        </div>
        <ol className="space-y-2">
          {columns.map((column, index) => (
            <ColumnCard
              key={column.id}
              column={column}
              index={index}
              count={columns.length}
              kind={kind}
              catalogs={catalogs}
              isLoadingCatalogs={isLoadingCatalogs}
              onChange={(next) =>
                setColumns(
                  columns.map((current) =>
                    current.id === next.id ? next : current,
                  ),
                )
              }
              onMove={(offset) =>
                setColumns(moveItem(columns, index, index + offset))
              }
              onRemove={() =>
                setColumns(
                  columns.filter((current) => current.id !== column.id),
                )
              }
            />
          ))}
        </ol>
        <Button
          size="sm"
          variant="outline"
          disabled={columns.length >= FORM_LIMITS.maxTableColumns}
          onClick={() =>
            setColumns([
              ...columns,
              newTableColumn(`Columna ${columns.length + 1}`),
            ])
          }
        >
          <Plus className="size-4" />
          Añadir columna
        </Button>
      </section>
    </div>
  );
};
