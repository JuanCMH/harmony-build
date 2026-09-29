"use client";

import { ColorSelect } from "@/components/harmony/color-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomColor } from "@/lib/custom-colors";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { isValidLogo } from "../store/use-logo-upload";
import { ProjectAvatar } from "./project-avatar";

export interface ProjectFormValues {
  name: string;
  /** Vacío si el proyecto no lleva código. */
  code: string;
  primaryColor: CustomColor;
  secondaryColor: CustomColor;
  /** Un logo nuevo, todavía sin subir. `null` si no se eligió ninguno. */
  logoFile: File | null;
}

interface ProjectFormProps {
  id: string;
  /** Los datos de partida al editar. Sin ellos, el formulario es de creación. */
  initial?: {
    name: string;
    code?: string;
    primaryColor: CustomColor;
    secondaryColor: CustomColor;
    logoImage?: string;
  };
  disabled: boolean;
  onSubmit: (values: ProjectFormValues) => void;
}

/**
 * Los campos con los que un proyecto se identifica: logo, nombre, código y
 * sus dos colores. Lo comparten crear y editar.
 *
 * Arranca con `initial` y no vuelve a sincronizarse: quien edita lo monta al
 * abrir. Reescribir el estado cada vez que llega la consulta reactiva borraba
 * lo que se estaba escribiendo cuando otra persona tocaba el proyecto.
 */
export const ProjectForm = ({
  id,
  initial,
  disabled,
  onSubmit,
}: ProjectFormProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [primaryColor, setPrimaryColor] = useState<CustomColor>(
    initial?.primaryColor ?? "blue",
  );
  const [secondaryColor, setSecondaryColor] = useState<CustomColor>(
    initial?.secondaryColor ?? "red",
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>();

  // La vista previa es una URL de objeto: vive mientras no se revoque.
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ name, code, primaryColor, secondaryColor, logoFile });
  };

  return (
    <form id={id} className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        {/* El input es el control real —se alcanza con el tabulador y los
            lectores lo anuncian—; el avatar es su etiqueta. */}
        <label
          htmlFor={`${id}-logo`}
          className={cn(
            "shrink-0 rounded-lg transition-opacity hover:opacity-80 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span className="sr-only">Elegir el logo del proyecto</span>
          <ProjectAvatar
            name={name}
            logoImage={logoPreview ?? initial?.logoImage}
            className="size-16 rounded-lg"
            fallbackClassName="rounded-lg text-lg"
          />
          <input
            id={`${id}-logo`}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && isValidLogo(file)) setLogoFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <div className="min-w-0">
          <p className="text-sm font-medium">Logo</p>
          <p className="mt-1 text-ui text-muted-foreground">
            Pulsa la imagen para elegirlo. Máximo 5 MB.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-name`}>Nombre</Label>
          <Input
            id={`${id}-name`}
            required
            minLength={4}
            maxLength={40}
            value={name}
            disabled={disabled}
            placeholder="ej: Torre Mirador"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-code`}>Código (opcional)</Label>
          <Input
            id={`${id}-code`}
            maxLength={20}
            value={code}
            disabled={disabled}
            placeholder="ej: OB-014"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-primary-color`}>Color primario</Label>
          <ColorSelect
            id={`${id}-primary-color`}
            value={primaryColor}
            disabled={disabled}
            onChange={setPrimaryColor}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-secondary-color`}>Color secundario</Label>
          <ColorSelect
            id={`${id}-secondary-color`}
            value={secondaryColor}
            disabled={disabled}
            onChange={setSecondaryColor}
          />
        </div>
      </div>
    </form>
  );
};
