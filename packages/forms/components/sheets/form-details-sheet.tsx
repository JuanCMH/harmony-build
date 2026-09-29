"use client";

import {
  HarmonySheet,
  HarmonySheetContent,
  HarmonySheetFooter,
  HarmonySheetHeader,
  SheetClose,
} from "@/components/harmony/harmony-sheet";
import { SearchableMultiSelect } from "@/components/harmony/searchable-multi-select";
import { SearchableSelect } from "@/components/harmony/searchable-select";
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
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import {
  FORM_CODE_MAX,
  FORM_DESCRIPTION_MAX,
  FORM_NAME_MAX,
  FORM_NAME_MIN,
  type FormAudience,
  type FormKind,
} from "@/convex/lib/form_types";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { useGetRoles } from "@/packages/roles/api";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { useGetFormCategories, useUpdateFormDetails } from "../../api";
import { ENTITY_ICONS } from "../../lib/field-catalog";

const FORM_ID = "form-details-form";

/** «Sin categoría» necesita un valor propio: la lista no elige el vacío. */
const NO_CATEGORY = "none";

/** Lo que el sheet necesita del formato, tal como lo da `forms.getById`. */
export interface FormDetails {
  _id: Id<"forms">;
  kind: FormKind;
  name: string;
  code?: string;
  description?: string;
  categoryId?: Id<"formCategories">;
  audience: FormAudience;
  audienceRoleIds: Id<"roles">[];
}

const DetailsForm = ({
  form,
  onDone,
}: {
  form: FormDetails;
  onDone: () => void;
}) => {
  const projectId = useProjectId();
  const { data: categories } = useGetFormCategories({ projectId });
  const { data: roles } = useGetRoles({ projectId });
  const { mutate: updateDetails, isPending } = useUpdateFormDetails();

  const [name, setName] = useState(form.name);
  const [code, setCode] = useState(form.code ?? "");
  const [description, setDescription] = useState(form.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    form.categoryId ?? NO_CATEGORY,
  );
  const [audience, setAudience] = useState<FormAudience>(form.audience);
  const [roleIds, setRoleIds] = useState<string[]>(form.audienceRoleIds);

  const isCatalog = form.kind === "catalog";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = code.trim();
    const trimmedDescription = description.trim();
    // `updateDetails` reemplaza todo: lo que no se manda se borra.
    updateDetails(
      {
        id: form._id,
        name: name.trim(),
        ...(trimmedCode ? { code: trimmedCode } : {}),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        ...(categoryId !== NO_CATEGORY
          ? { categoryId: categoryId as Id<"formCategories"> }
          : {}),
        audience,
        audienceRoleIds: audience === "roles" ? (roleIds as Id<"roles">[]) : [],
      },
      {
        onSuccess: () => {
          toast.success("Detalles guardados correctamente");
          onDone();
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <HarmonySheetContent>
        <form id={FORM_ID} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="details-name">Nombre</Label>
            <Input
              id="details-name"
              required
              minLength={FORM_NAME_MIN}
              maxLength={FORM_NAME_MAX}
              value={name}
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="details-code">
                Código
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id="details-code"
                maxLength={FORM_CODE_MAX}
                placeholder="Ej.: SST-F-010"
                value={code}
                disabled={isPending}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details-category">Categoría</Label>
              <SearchableSelect
                id="details-category"
                className="w-full"
                searchPlaceholder="Buscar una categoría…"
                value={categoryId}
                disabled={isPending}
                options={[
                  { value: NO_CATEGORY, label: "Sin categoría" },
                  ...(categories ?? []).map((category) => ({
                    value: category._id,
                    label: category.name,
                  })),
                ]}
                onValueChange={setCategoryId}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details-description">
              Descripción
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="details-description"
              className="min-h-20"
              maxLength={FORM_DESCRIPTION_MAX}
              placeholder="Para qué sirve y cuándo se diligencia."
              value={description}
              disabled={isPending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {/* La audiencia restringe a quien diligencia, no a quien consulta. Un
              listado no se diligencia: sus elementos los mantiene quien tiene
              «Editar listados». */}
          {isCatalog ? null : (
            <div className="space-y-2">
              <Label htmlFor="details-audience">Quién lo diligencia</Label>
              <Select
                value={audience}
                disabled={isPending}
                onValueChange={(value) => setAudience(value as FormAudience)}
              >
                <SelectTrigger id="details-audience" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los que pueden diligenciar formatos
                  </SelectItem>
                  <SelectItem value="roles">Sólo unos roles</SelectItem>
                </SelectContent>
              </Select>
              {audience === "roles" ? (
                <SearchableMultiSelect
                  aria-label="Roles que lo diligencian"
                  className="w-full"
                  placeholder="Elige los roles"
                  searchPlaceholder="Buscar un rol…"
                  emptyText="El proyecto no tiene roles."
                  value={roleIds}
                  disabled={isPending}
                  onValueChange={setRoleIds}
                  groups={[
                    {
                      label: "",
                      options: (roles ?? []).map((role) => ({
                        value: role._id,
                        label: role.name,
                      })),
                    },
                  ]}
                />
              ) : null}
              <p className="text-xs text-muted-foreground">
                Propietario y administrador lo diligencian siempre. La audiencia
                no cambia quién ve las respuestas.
              </p>
            </div>
          )}
        </form>
      </HarmonySheetContent>
      <HarmonySheetFooter className="justify-end">
        <SheetClose asChild>
          <Button variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </SheetClose>
        <Button type="submit" form={FORM_ID} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar
        </Button>
      </HarmonySheetFooter>
    </>
  );
};

/**
 * Los detalles del formato: cómo se llama, su código, su categoría y quién lo
 * diligencia. Se guardan al momento y aparte del borrador: no son parte de la
 * versión, y cambiarlos no obliga a publicar.
 */
export const FormDetailsSheet = ({
  open,
  onOpenChange,
  form,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormDetails;
}) => (
  <HarmonySheet open={open} onOpenChange={onOpenChange}>
    <HarmonySheetHeader
      icon={form.kind === "catalog" ? ENTITY_ICONS.catalog : ENTITY_ICONS.form}
      title={
        form.kind === "catalog"
          ? "Detalles del listado"
          : "Detalles del formato"
      }
      description="Se guardan al momento, sin publicar."
    />
    {/* Se monta al abrirse: reabre siempre con lo guardado (`03 §6`). */}
    {open ? (
      <DetailsForm form={form} onDone={() => onOpenChange(false)} />
    ) : null}
  </HarmonySheet>
);
