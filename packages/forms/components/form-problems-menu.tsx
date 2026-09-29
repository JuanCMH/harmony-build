"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OctagonAlert, TriangleAlert } from "lucide-react";

import { type BuilderProblems, countProblems } from "../lib/builder-problems";
import type { LocatedProblem } from "../lib/builder-sections";

/**
 * Todo lo que está mal en el borrador, en un desplegable de la cabecera.
 *
 * Lo que impide guardar va en rojo, porque bloquea; lo que sólo impide
 * publicar, en amarillo. Pulsar un problema lleva a su sección y elige su
 * campo: saber que algo falla sin saber dónde obliga a recorrer el formato.
 */
export const FormProblemsMenu = ({
  problems,
  onGo,
}: {
  problems: BuilderProblems;
  onGo: (problem: LocatedProblem) => void;
}) => {
  const total = problems.save.length + problems.publish.length;
  if (total === 0) return null;
  const blocksSave = problems.save.length > 0;
  const Icon = blocksSave ? OctagonAlert : TriangleAlert;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={
            blocksSave
              ? "text-red-700 hover:text-red-700 dark:text-red-400"
              : "text-yellow-700 hover:text-yellow-700 dark:text-yellow-400"
          }
        >
          <Icon className="size-4" />
          {countProblems(total)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-80 overflow-y-auto"
      >
        {blocksSave ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Impiden guardar
            </DropdownMenuLabel>
            {problems.save.map((problem, index) => (
              <DropdownMenuItem
                // Dos problemas pueden decir lo mismo de dos campos: el orden
                // es su identidad.
                key={index}
                className="flex-col items-start gap-0.5"
                onSelect={() => onGo(problem)}
              >
                <span className="text-sm">{problem.message}</span>
                {problem.location ? (
                  <span className="text-xs text-muted-foreground">
                    {problem.location}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
        {blocksSave && problems.publish.length > 0 ? (
          <DropdownMenuSeparator />
        ) : null}
        {problems.publish.length > 0 ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Impiden publicar
            </DropdownMenuLabel>
            {problems.publish.map((message) => (
              // No llevan a ningún sitio: se leen, no se pulsan.
              <p key={message} className="px-2 py-1.5 text-sm">
                {message}
              </p>
            ))}
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
