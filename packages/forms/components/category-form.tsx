"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

/** Los límites del nombre, que el servidor vuelve a comprobar
 *  (`formCategoriesErrors.invalidName`). */
const NAME_MIN = 2;
const NAME_MAX = 40;

interface CategoryFormProps {
  id: string;
  /** El nombre de partida al renombrar. Sin él, el formulario es de creación. */
  initialName?: string;
  disabled: boolean;
  onSubmit: (name: string) => void;
}

/**
 * El nombre de una categoría de formatos. Lo comparten crear y renombrar: una
 * categoría no tiene más que eso.
 */
export const CategoryForm = ({
  id,
  initialName,
  disabled,
  onSubmit,
}: CategoryFormProps) => {
  const [name, setName] = useState(initialName ?? "");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(name);
  };

  return (
    <form id={id} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`}>Nombre de la categoría</Label>
        <Input
          id={`${id}-name`}
          required
          autoFocus
          minLength={NAME_MIN}
          maxLength={NAME_MAX}
          value={name}
          disabled={disabled}
          placeholder="ej: Seguridad y salud en el trabajo"
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Con ella se filtran los formatos y los listados del proyecto.
        </p>
      </div>
    </form>
  );
};
