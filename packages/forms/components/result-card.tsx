"use client";

import { PanelCard } from "@/components/harmony/panel-card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ResultConfig, ResultData } from "@/convex/lib/result_types";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { RESULT_CATALOG } from "../lib/result-catalog";
import { ResultView } from "./result-view";

interface ResultCardProps {
  name: string;
  /** Lo que va bajo el nombre: el formato del que sale, o el tipo. */
  caption: string;
  config: ResultConfig;
  data: ResultData;
  problem: string | null;
  /** Lo propio de la tarjeta: «Editar», «Quitar». */
  actions?: ReactNode;
  /** Un aviso sobre las cifras: que son de una parte del periodo. */
  notice?: string;
  className?: string;
}

/**
 * Un resultado en su tarjeta (`03 §1.3`): el icono de su tipo, su nombre,
 * cómo se lee y, dentro, su gráfica. La misma en la página del formato y en el tablero.
 */
export const ResultCard = ({
  name,
  caption,
  config,
  data,
  problem,
  actions,
  notice,
  className,
}: ResultCardProps) => {
  const kind = RESULT_CATALOG[config.type];
  return (
    <PanelCard
      icon={kind.icon}
      title={name}
      description={caption}
      actions={
        <>
          {/* Un popover y no un tooltip: en teléfono no hay «pasar por
              encima», y la ayuda tiene que abrirse al tocar. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                className="text-muted-foreground"
                aria-label={`Cómo se lee ${name}`}
              >
                <Info />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-1 p-3">
              <p className="text-sm font-medium">{kind.label}</p>
              <p className="text-xs text-muted-foreground">{kind.help}</p>
            </PopoverContent>
          </Popover>
          {actions}
        </>
      }
      className={className}
      // La tabla va a sangre: sus celdas ya traen el margen, y con otro
      // encima queda una caja dentro de la tarjeta (`03 §1.3`).
      contentClassName={config.type === "table" ? "p-0" : "p-4"}
    >
      {notice ? (
        <p
          className={
            config.type === "table"
              ? "flex items-start gap-1.5 px-4 pt-3 text-xs text-muted-foreground"
              : "mb-3 flex items-start gap-1.5 text-xs text-muted-foreground"
          }
        >
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          {notice}
        </p>
      ) : null}
      <ResultView config={config} data={data} problem={problem} />
    </PanelCard>
  );
};
