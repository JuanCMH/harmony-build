"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";

import {
  type SortRule,
  filterEntities,
  parseSort,
  serializeSort,
  sortEntities,
  toggleSortRule,
} from "./entity-table.utils";

/**
 * Un listado con búsqueda y orden, con su estado en la dirección.
 *
 * El listado de personal y el de clientes lo tenían escrito cada uno por su
 * cuenta, idéntico salvo dos nombres de variable, y ninguno de los dos ponía
 * nada en la URL — así que un listado filtrado y ordenado no se podía enlazar
 * ni recuperar al volver atrás (`00 §5.1`, presupuesto del mapa).
 */
export function useEntityList<T extends Record<string, unknown>, M extends string>({
  items,
  modes,
  sortableKeys,
  defaultSort,
}: {
  items: readonly T[] | undefined;
  /** Por qué campo se puede buscar. El primero es el predeterminado. */
  modes: readonly { value: M; label: string }[];
  sortableKeys: readonly (keyof T & string)[];
  defaultSort: SortRule<keyof T & string>;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 500);

  const [mode, setMode] = useQueryState(
    "buscarPor",
    parseAsStringLiteral(modes.map((m) => m.value)).withDefault(modes[0].value),
  );
  const [ordenCrudo, setOrdenCrudo] = useQueryState("orden", parseAsString);

  const rules = useMemo(() => {
    const leidas = parseSort(ordenCrudo, sortableKeys);
    return leidas.length > 0 ? leidas : [defaultSort];
  }, [ordenCrudo, sortableKeys, defaultSort]);

  const visibles = useMemo(() => {
    const base = items ?? [];
    return sortEntities(
      filterEntities(base, debounced, mode as keyof T & string),
      rules,
    );
  }, [items, debounced, mode, rules]);

  /** `Mayús` + clic añade la columna como desempate en vez de sustituir. */
  const requestSort = (key: keyof T & string, multi: boolean) => {
    const siguiente = toggleSortRule(rules, key, multi);
    setOrdenCrudo(siguiente.length > 0 ? serializeSort(siguiente) : null);
  };

  return { visibles, search, setSearch, mode, setMode, rules, requestSort, modes };
}

/** Buscador con selector de campo. */
export const EntitySearch = <M extends string>({
  search,
  setSearch,
  mode,
  setMode,
  modes,
}: {
  search: string;
  setSearch: (value: string) => void;
  mode: M;
  setMode: (value: M) => void;
  modes: readonly { value: M; label: string }[];
}) => {
  const actual = modes.find((m) => m.value === mode);
  return (
    <div className="flex gap-2">
      <Input
        className="w-xs"
        placeholder={`Buscar por ${actual?.label.toLowerCase() ?? "nombre"}`}
        aria-label={`Buscar por ${actual?.label.toLowerCase() ?? "nombre"}`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select value={mode} onValueChange={(v) => setMode(v as M)}>
        <SelectTrigger className="w-48" aria-label="Buscar por">
          <SelectValue>{actual?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {modes.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

/** Cabecera de columna ordenable. */
export const SortableHeader = ({
  columnKey,
  title,
  rules,
  requestSort,
  className,
}: {
  columnKey: string;
  title: string;
  rules: readonly SortRule[];
  requestSort: (key: never, multi: boolean) => void;
  className?: string;
}) => {
  const posicion = rules.findIndex((r) => r.key === columnKey);
  const regla = posicion === -1 ? undefined : rules[posicion];

  return (
    <TableHead
      className={cn("p-0 text-md font-medium uppercase text-foreground", className)}
      aria-sort={
        regla
          ? regla.direction === "ascending"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <Button
        variant="ghost"
        className="flex h-full w-full items-center justify-start p-2 text-md hover:bg-transparent"
        onClick={(e) => requestSort(columnKey as never, e.shiftKey)}
      >
        <span className="flex items-center">
          {title}
          {!regla && <ChevronsUpDown className="ml-2 size-4 opacity-40" />}
          {regla?.direction === "ascending" && <ChevronUp className="ml-2 size-4" />}
          {regla?.direction === "descending" && (
            <ChevronDown className="ml-2 size-4" />
          )}
          {regla && rules.length > 1 && (
            <span className="ml-1 text-xs font-bold">{posicion + 1}</span>
          )}
        </span>
      </Button>
    </TableHead>
  );
};
