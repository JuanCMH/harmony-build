"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CollectionEmpty,
  CollectionLoading,
  useCollectionListClassName,
} from "@/components/harmony/collection";
import {
  SettingsCard,
  useEstaEnAreaDeAjustes,
} from "@/components/harmony/settings-area";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

/**
 * Una sección de una pantalla de ajustes.
 *
 * Las pantallas de ajustes son listas de secciones: identidad, personas y —desde
 * S3— los ocho catálogos. Antes cada catálogo era un sheet propio de entre 132 y
 * 358 líneas, ocho veces la misma estructura, y llegar a editar uno costaba tres
 * niveles de overlay.
 */
export const SettingsSection = ({
  icon: Icon,
  title,
  count,
  countLabel,
  countHint,
  description,
  actions,
  children,
  className,
}: {
  /** Sólo se pinta fuera de un área de ajustes, donde distingue una sección de
   *  la siguiente. Dentro, el sidebar ya dice cuál es. */
  icon?: LucideIcon;
  title: string;
  /** Cuántos hay. Va junto al título, no entre los controles: un dato no es una
   *  acción, y en la zona de acciones se disfraza de botón. */
  count?: number;
  /** «7 cargos». Lo que oye quien no ve el número suelto. */
  countLabel?: string;
  /** El matiz que el número no dice, como los correos verificados. */
  countHint?: string;
  description: string;
  /** Lo propio de la sección: un filtro, el botón de crear. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => {
  // Dentro de un área de ajustes la sección **es** la pantalla: el sidebar ya
  // dice cuál, y el icono repetido dentro no añade nada. Acompañada de otras en
  // la ficha de una persona, el icono es lo que las distingue.
  const enArea = useEstaEnAreaDeAjustes();

  return (
    <section
      className={cn(enArea ? "space-y-10" : "space-y-3", className)}
      aria-labelledby={sectionId(title)}
    >
      <div
        className={cn("flex gap-2", enArea ? "items-start" : "items-center")}
      >
        {!enArea && Icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-h-indigo/10 bg-h-indigo/10 text-h-indigo">
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2
              id={sectionId(title)}
              className={cn(
                "tracking-tight",
                enArea ? "text-3xl font-medium" : "text-sm font-medium",
              )}
            >
              {title}
            </h2>
            {typeof count === "number" ? (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "tabular-nums text-muted-foreground",
                    enArea ? "text-xl" : "text-xs",
                  )}
                >
                  {count}
                  {countHint ? ` · ${countHint}` : ""}
                </span>
                {/* El número suelto no dice de qué es; esto sí. */}
                <span className="sr-only">{countLabel ?? `${count}`}</span>
              </>
            ) : null}
          </div>
          <p
            className={cn(
              "text-muted-foreground",
              enArea ? "mt-1 text-sm" : "text-xs",
            )}
          >
            {description}
          </p>
        </div>
        {actions && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </section>
  );
};

/**
 * Ancla estable para `aria-labelledby` y para enlazar una sección concreta.
 *
 * La eñe se convierte en `n`, como en cualquier slug en español: «Años» da
 * `anos`. Es indistinguible de «Anos», y da igual — los títulos de sección son
 * un puñado fijo y ninguno colisiona.
 */
/** A partir de aquí una lista deja de leerse de una pasada y gana un buscador. */
const UMBRAL_BUSCADOR = 8;

export const sectionId = (title: string) =>
  `seccion-${title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

/**
 * Un catálogo dentro de una pantalla de ajustes: la lista, su estado vacío, su
 * esqueleto de carga y el botón de crear.
 *
 * Lo que **no** hace es abrir el formulario. Crear y editar siguen siendo el
 * modal que cada catálogo ya tenía, colgado de la página:
 * página (0) → modal (1) → confirmación (2), dentro del presupuesto del mapa.
 */
export function CatalogSection<T>({
  icon,
  title,
  description,
  items,
  isLoading,
  emptyTitle,
  emptyHint,
  onCreate,
  createLabel = "Crear",
  countLabel,
  countHint,
  filters,
  toolbar,
  renderItem,
  renderList,
  searchText,
  searchPlaceholder,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** `null` incluido: varias consultas de Convex lo devuelven al no haber
   *  acceso, y tratarlo como «todavía cargando» dejaría el esqueleto puesto
   *  para siempre. Aquí es «cero elementos». */
  items: T[] | null | undefined;
  isLoading: boolean;
  emptyTitle: string;
  emptyHint?: string;
  /** Ausente si el miembro no puede crear: la sección se ve, el botón no. */
  onCreate?: () => void;
  createLabel?: string;
  /** «3 cargos». En singular y plural, que el español lo pide. Es lo que se
   *  anuncia: a la vista sólo va el número, junto al título. */
  countLabel?: (count: number) => string;
  /** El matiz que el número no dice, como los correos verificados. */
  countHint?: (count: number) => string;
  /** Filtros propios, como el año de los cargos. Van en la cabecera, junto al
   *  botón de crear: caben uno o dos. */
  filters?: ReactNode;
  /** Filtros que no caben en la cabecera. Van en su propia fila, a la derecha
   *  del buscador, y no desaparecen cuando el filtro deja la lista vacía. Los
   *  centros de costo llevan dos filtros y un menú de plantilla: en la
   *  cabecera aplastaban el título a dos líneas y la descripción a una columna
   *  de 170px (medido el 21 de septiembre de 2026). */
  toolbar?: ReactNode;
  renderItem?: (item: T) => ReactNode;
  /** Salida para la lista que no es una lista. Las etiquetas de turno se
   *  reordenan arrastrando y se separan en pestañas; el resto de la sección
   *  —cabecera, contador, crear— es idéntico, y eso es lo que se reutiliza. */
  renderList?: (items: T[]) => ReactNode;
  /** De qué texto se busca. Sin ella no hay buscador: un catálogo sin nada que
   *  teclear no lo necesita. */
  searchText?: (item: T) => string;
  /** «Buscar un cargo». En la lengua del catálogo, no «Buscar…». */
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const enArea = useEstaEnAreaDeAjustes();
  const listaClassName = useCollectionListClassName();

  const total = items?.length ?? 0;

  // El buscador aparece cuando la lista deja de leerse de una pasada. Por
  // debajo de eso ocupa sitio y no ahorra nada: en un catálogo de tres cargos,
  // teclear es más lento que mirar.
  const searchable = Boolean(searchText) && total > UMBRAL_BUSCADOR;

  const visibles = useMemo(() => {
    const consulta = debounced.trim().toLowerCase();
    if (!items || !searchText || !searchable || consulta === "") return items;
    return items.filter((item) =>
      searchText(item).toLowerCase().includes(consulta),
    );
  }, [items, searchText, searchable, debounced]);

  const buscando = searchable && debounced.trim() !== "";
  const count = visibles?.length ?? 0;

  return (
    <SettingsSection
      icon={icon}
      title={title}
      // En cero no se pinta: «Roles 0» junto a «No tienes roles personalizados»
      // dice dos veces lo mismo, y el número vacío no es un dato, es un hueco.
      count={!isLoading && countLabel && total > 0 ? total : undefined}
      countLabel={countLabel?.(total)}
      countHint={countHint?.(total)}
      description={description}
      actions={
        <>
          {filters}
          {onCreate && (
            <Button size="sm" variant="outline" onClick={onCreate}>
              <Plus className="size-4" />
              {createLabel}
            </Button>
          )}
        </>
      }
    >
      {/* El buscador no se esconde mientras carga: aparecer después empuja la
          lista hacia abajo justo cuando llegan los datos, que es el salto que
          `03 §2.4` pide evitar. Se deshabilita, que buscar en nada no lleva a
          ninguna parte. */}
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {searchable && (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                disabled={isLoading}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  searchPlaceholder ?? `Buscar en ${title.toLowerCase()}`
                }
                aria-label={
                  searchPlaceholder ?? `Buscar en ${title.toLowerCase()}`
                }
                className="pl-8"
              />
            </div>
          )}
          {toolbar && (
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              {toolbar}
            </div>
          )}
        </div>
      )}
      {isLoading && <CollectionLoading />}
      {!isLoading && count === 0 && buscando && (
        <CollectionEmpty
          icon={Search}
          title={`Nada coincide con «${debounced.trim()}»`}
          hint="Prueba con otra palabra o revisa el filtro."
        />
      )}
      {!isLoading && count === 0 && !buscando && (
        <CollectionEmpty icon={icon} title={emptyTitle} hint={emptyHint} />
      )}
      {!isLoading && count > 0 && visibles ? (
        enArea && !renderList ? (
          <SettingsCard>
            {visibles.map((item) => renderItem?.(item))}
          </SettingsCard>
        ) : (
          <div
            className={
              renderList && !enArea ? "flex flex-col gap-2" : listaClassName
            }
          >
            {renderList
              ? renderList(visibles)
              : visibles.map((item) => renderItem?.(item))}
          </div>
        )
      ) : null}
    </SettingsSection>
  );
}
