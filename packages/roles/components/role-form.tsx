"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  type PermissionValue,
  emptyPermissions,
  listOfPermissions,
  permissionsGroups,
} from "../lib/permissions";

export interface RoleFormValues {
  name: string;
  permissions: Record<PermissionValue, boolean>;
}

interface RoleFormProps {
  id: string;
  /** El rol de partida al editar. Sin él, el formulario es de creación. */
  initial?: RoleFormValues;
  disabled: boolean;
  onSubmit: (values: RoleFormValues) => void;
}

/**
 * El nombre de un rol y sus llaves, agrupadas como en el catálogo
 * (`lib/permissions.ts`). Lo comparten crear y editar.
 *
 * Las llaves van todas a la vista: son ocho, y esconderlas detrás de un
 * selector de grupo obligaba a recorrer los grupos uno a uno para saber qué
 * tenía activo un rol.
 */
export const RoleForm = ({
  id,
  initial,
  disabled,
  onSubmit,
}: RoleFormProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [permissions, setPermissions] = useState(
    initial?.permissions ?? emptyPermissions,
  );

  const granted = listOfPermissions.filter(
    (permission) => permissions[permission.value],
  ).length;
  const allGranted = granted === listOfPermissions.length;

  const toggleAll = () =>
    setPermissions(
      Object.fromEntries(
        listOfPermissions.map((permission) => [permission.value, !allGranted]),
      ) as Record<PermissionValue, boolean>,
    );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ name, permissions });
  };

  return (
    <form id={id} className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`}>Nombre del rol</Label>
        <Input
          id={`${id}-name`}
          required
          minLength={2}
          maxLength={40}
          value={name}
          disabled={disabled}
          placeholder="ej: Residente de obra"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium">Permisos</h3>
            <span className="text-ui tabular-nums text-muted-foreground">
              {granted} de {listOfPermissions.length}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={toggleAll}
          >
            {allGranted ? "Quitar todos" : "Activar todos"}
          </Button>
        </div>

        {permissionsGroups.map((group) => (
          <fieldset key={group} className="space-y-1.5" disabled={disabled}>
            <legend className="text-xs text-muted-foreground">{group}</legend>
            <div className="divide-y divide-border/60 rounded-lg border bg-card">
              {listOfPermissions
                .filter((permission) => permission.group === group)
                .map((permission) => (
                  <label
                    key={permission.value}
                    htmlFor={`${id}-${permission.value}`}
                    className="flex min-h-10 items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    {permission.name}
                    <Switch
                      id={`${id}-${permission.value}`}
                      disabled={disabled}
                      checked={permissions[permission.value]}
                      onCheckedChange={(checked) =>
                        setPermissions((current) => ({
                          ...current,
                          [permission.value]: checked,
                        }))
                      }
                    />
                  </label>
                ))}
            </div>
          </fieldset>
        ))}
      </div>
    </form>
  );
};
