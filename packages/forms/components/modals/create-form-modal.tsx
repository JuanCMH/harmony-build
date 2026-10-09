"use client";

import {
  DialogClose,
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Id } from "@/convex/_generated/dataModel";
import {
  FORM_CODE_MAX,
  FORM_NAME_MAX,
  FORM_NAME_MIN,
  type FormKind,
} from "@/convex/lib/form_types";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { useCreateForm, useGetFormCategories } from "../../api";
import { ENTITY_ICONS } from "../../lib/field-catalog";
import { formRoutes } from "../../lib/routes";

const FORM_ID = "create-form-form";

/** «Sin categoría» necesita un valor propio: la lista no elige el vacío. */
const NO_CATEGORY = "none";

/**
 * Las dos clases, explicadas por lo que son en la obra y no por lo que hacen
 * en la base de datos: quien crea un formato no tiene por qué saber qué es
 * «una respuesta editable» (diseño §1).
 */
const KIND_OPTIONS: readonly {
  kind: FormKind;
  title: string;
  summary: string;
  examples: string;
  consequence: string;
}[] = [
  {
    kind: "record",
    title: "Formato",
    summary: "Lo que la obra hace",
    examples: "Una inspección, una entrega, un registro diario.",
    consequence: "Sus respuestas no se editan; se anulan.",
  },
  {
    kind: "catalog",
    title: "Listado",
    summary: "Lo que la obra tiene",
    examples: "Equipos, vehículos, personas, extintores.",
    consequence:
      "Sus elementos se mantienen al día y otros formatos los eligen.",
  },
];

const KIND_COPY: Record<
  FormKind,
  { title: string; description: string; placeholder: string; created: string }
> = {
  record: {
    title: "Crear formato",
    description: "Ponle nombre; sus campos se diseñan en el paso siguiente.",
    placeholder: "Ej.: Inspección preoperacional de vehículos",
    created: "Formato creado correctamente",
  },
  catalog: {
    title: "Crear listado",
    description: "Ponle nombre; sus campos se diseñan en el paso siguiente.",
    placeholder: "Ej.: Vehículos",
    created: "Listado creado correctamente",
  },
};

interface CreateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La clase de la pestaña desde la que se abrió. */
  defaultKind: FormKind;
}

/**
 * Crear un formato o un listado, en dos pasos: primero la clase, que no se
 * puede cambiar después, y luego cómo se llama.
 *
 * Se monta al abrirse y se desmonta al cerrarse: así reabre siempre limpio
 * (`03 §6`).
 */
export const CreateFormModal = ({
  open,
  onOpenChange,
  defaultKind,
}: CreateFormModalProps) => {
  const projectId = useProjectId();
  const router = useRouter();
  const { data: categories } = useGetFormCategories({ projectId });
  const { mutate: createForm, isPending } = useCreateForm();

  const [step, setStep] = useState<"kind" | "details">("kind");
  const [kind, setKind] = useState<FormKind>(defaultKind);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);

  const copy = KIND_COPY[kind];
  const hasCategories = (categories?.length ?? 0) > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = code.trim();

    createForm(
      {
        projectId,
        kind,
        name: name.trim(),
        ...(trimmedCode ? { code: trimmedCode } : {}),
        ...(categoryId !== NO_CATEGORY
          ? { categoryId: categoryId as Id<"formCategories"> }
          : {}),
      },
      {
        onSuccess: (id) => {
          toast.success(copy.created);
          onOpenChange(false);
          router.push(formRoutes.edit(projectId, id));
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <HarmonyModal
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="sm:max-w-2xl"
    >
      {step === "kind" ? (
        <>
          <HarmonyModalHeader
            icon={ENTITY_ICONS.form}
            title="¿Qué vas a crear?"
            description="La clase se elige ahora y no se puede cambiar después."
          />
          <HarmonyModalContent>
            <div
              role="radiogroup"
              aria-label="Clase de formato"
              className="grid gap-3 sm:grid-cols-2"
            >
              {KIND_OPTIONS.map((option) => {
                const Icon =
                  ENTITY_ICONS[option.kind === "record" ? "form" : "catalog"];
                const isSelected = kind === option.kind;
                return (
                  // Un botón con papel de radio, y no un `input`: la opción
                  // es una tarjeta entera, con su explicación dentro.
                  <button
                    key={option.kind}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setKind(option.kind)}
                    onDoubleClick={() => setStep("details")}
                    className={cn(
                      "flex h-full flex-col gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isSelected
                        ? "border-h-indigo/40 bg-h-indigo/5"
                        : "hover:bg-accent/30",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-h-indigo/10 bg-h-indigo/10 text-h-indigo">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium tracking-tight">
                          {option.title}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {option.summary}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                    </span>
                    <span className="space-y-1 text-sm">
                      <span className="block">{option.examples}</span>
                      <span className="block text-muted-foreground">
                        {option.consequence}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </HarmonyModalContent>
          <HarmonyModalFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={() => setStep("details")}>Continuar</Button>
          </HarmonyModalFooter>
        </>
      ) : (
        <>
          <HarmonyModalHeader
            icon={ENTITY_ICONS[kind === "record" ? "form" : "catalog"]}
            title={copy.title}
            description={copy.description}
          />
          <HarmonyModalContent>
            <form
              id={FORM_ID}
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-form-name">Nombre</Label>
                <Input
                  id="create-form-name"
                  autoFocus
                  required
                  minLength={FORM_NAME_MIN}
                  maxLength={FORM_NAME_MAX}
                  placeholder={copy.placeholder}
                  value={name}
                  disabled={isPending}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div
                className={cn("space-y-2", !hasCategories && "sm:col-span-2")}
              >
                <Label htmlFor="create-form-code">
                  Código
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="create-form-code"
                  maxLength={FORM_CODE_MAX}
                  placeholder="Ej.: SST-F-010"
                  value={code}
                  disabled={isPending}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              {hasCategories ? (
                <div className="space-y-2">
                  <Label htmlFor="create-form-category">
                    Categoría
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </Label>
                  <SearchableSelect
                    id="create-form-category"
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
              ) : null}
            </form>
          </HarmonyModalContent>
          <HarmonyModalFooter>
            <Button
              variant="ghost"
              className="mr-auto text-muted-foreground"
              disabled={isPending}
              onClick={() => setStep("kind")}
            >
              <ArrowLeft className="size-4" />
              Atrás
            </Button>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" form={FORM_ID} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Crear
            </Button>
          </HarmonyModalFooter>
        </>
      )}
    </HarmonyModal>
  );
};
