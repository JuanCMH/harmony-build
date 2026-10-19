"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { visibleTabCount } from "../lib/tabs-fit";

interface DashboardTabsProps {
  tabs: readonly { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

const labelOf = (tab: { label: string }) => tab.label.trim() || "Sin nombre";

/** Las mismas medidas de `TabsTrigger`, para saber cuánto ocupa cada una. */
const MEASURE_TAB =
  "inline-flex shrink-0 items-center border border-transparent px-3 text-sm font-medium whitespace-nowrap";

/**
 * Las pestañas del tablero, sin desplazamiento de lado en ningún ancho.
 *
 * Desde `sm`, la fila enseña las que caben y guarda el resto en «Más»; si la
 * que se mira está guardada, el botón lleva su nombre. En teléfono la fila es
 * un solo selector. Van dentro de un `Tabs`: el contenido de cada pestaña
 * sigue siendo su `TabsContent`.
 */
export const DashboardTabs = ({
  tabs,
  activeId,
  onChange,
  className,
}: DashboardTabsProps) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(tabs.length);
  // Los nombres deciden los anchos: al renombrar una, se vuelve a medir.
  const labels = tabs.map(labelOf).join("\n");

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const fit = () => {
      const [more, ...items] = Array.from(measure.children).map(
        (child) => (child as HTMLElement).offsetWidth,
      );
      // 6px: el relleno de la fila, tres por lado.
      setCount(visibleTabCount(items, row.clientWidth - 6, more ?? 0));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [labels]);

  const shown = tabs.slice(0, count);
  const hidden = tabs.slice(count);
  const hiddenActive = hidden.find((tab) => tab.id === activeId);

  return (
    <div className={cn("min-w-0", className)}>
      <Select value={activeId} onValueChange={onChange}>
        <SelectTrigger aria-label="Pestaña del tablero" className="w-full sm:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tabs.map((tab) => (
            <SelectItem key={tab.id} value={tab.id}>
              {labelOf(tab)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div ref={rowRef} className="relative hidden min-w-0 sm:block">
        {/* Lo que se mide: el botón «Más» con el nombre más largo que puede
            llevar, y cada pestaña a su ancho natural. No se ve ni se lee. */}
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 flex h-0 overflow-hidden"
        >
          <span className={cn(MEASURE_TAB, "gap-1.5")}>
            {tabs.reduce(
              (longest, tab) =>
                labelOf(tab).length > longest.length ? labelOf(tab) : longest,
              "Más",
            )}
            <ChevronDown className="size-4" />
          </span>
          {tabs.map((tab) => (
            <span key={tab.id} className={MEASURE_TAB}>
              {labelOf(tab)}
            </span>
          ))}
        </div>

        <TabsList
          aria-label="Pestañas del tablero"
          className="overflow-x-visible"
        >
          {shown.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex-none">
              {labelOf(tab)}
            </TabsTrigger>
          ))}
          {hidden.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label={
                    hiddenActive
                      ? `${labelOf(hiddenActive)}: ver más pestañas`
                      : "Más pestañas"
                  }
                  className={cn(
                    "h-[calc(100%-1px)] flex-none gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium",
                    hiddenActive
                      ? "bg-background text-foreground shadow-sm hover:bg-background dark:border-input dark:bg-input/30"
                      : "text-foreground hover:bg-background/60 dark:text-muted-foreground",
                  )}
                >
                  {hiddenActive ? labelOf(hiddenActive) : "Más"}
                  <ChevronDown className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                {hidden.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onSelect={() => onChange(tab.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {labelOf(tab)}
                    </span>
                    {tab.id === activeId ? <Check aria-hidden /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </TabsList>
      </div>
    </div>
  );
};
