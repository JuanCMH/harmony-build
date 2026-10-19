"use client";

import { CollectionEmpty } from "@/components/harmony/collection";
import { SearchableSelect } from "@/components/harmony/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/convex/_generated/dataModel";
import { useConfirm } from "@/hooks/use-confirm";
import { useDebounce } from "@/hooks/use-debounce";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
  useArchiveForm,
  useDuplicateForm,
  useGetFormCategories,
  useGetForms,
  useRemoveForm,
  useUnarchiveForm,
} from "../api";
import {
  ENTITY_ICONS,
  FORM_ACTION_ICONS,
  KIND_ICON,
} from "../lib/field-catalog";
import {
  type FormRowActionKey,
  type FormViewerKeys,
  canFillNow,
  countForms,
  formRowActions,
  primaryRowAction,
} from "../lib/form-row-actions";
import { KIND_TEXT } from "../lib/kind-text";
import { formRoutes } from "../lib/routes";
import {
  STATUS_TONE_CLASS,
  type StatusBadge,
  UNPUBLISHED_CHANGES_BADGE,
  formStatusBadge,
  hasUnpublishedChanges,
} from "../lib/status";
import {
  FORM_CLASSES,
  type FormClass,
  KIND_BY_CLASS,
  useFormsListView,
} from "../store/use-forms-list-view";
import { type FormRowLinkKey, FormRowMenu } from "./form-row-menu";

type FormRow = NonNullable<ReturnType<typeof useGetForms>["data"]>[number];

const CLASS_LABEL: Record<FormClass, string> = {
  formatos: "Formatos",
  listados: "Listados",
  seguimientos: "Seguimientos",
};

/** «Todas» necesita un valor propio: la lista no elige el vacío. */
const ALL_CATEGORIES = "all";

const HEAD_CLASS = "h-9 px-3 text-ui font-normal text-muted-foreground";

const formatCount = (count: number) =>
  new Intl.NumberFormat("es-CO").format(count);

const StatusBadges = ({ form }: { form: FormRow }) => {
  const badges: StatusBadge[] = [
    formStatusBadge(form),
    ...(hasUnpublishedChanges(form) ? [UNPUBLISHED_CHANGES_BADGE] : []),
  ];
  return (
    <span className="flex flex-wrap items-center gap-1">
      {badges.map((badge) => (
        <Badge
          key={badge.label}
          variant="outline"
          className={STATUS_TONE_CLASS[badge.tone]}
        >
          {badge.label}
        </Badge>
      ))}
    </span>
  );
};

/** El esqueleto tiene la silueta de las filas que sustituye (`03 §2.4`). */
const ListLoading = () => (
  <div
    aria-busy="true"
    aria-live="polite"
    className="divide-y divide-border/60"
  >
    <span className="sr-only">Cargando…</span>
    {Array.from({ length: 6 }, (_, index) => index).map((index) => (
      <div key={index} className="flex items-center gap-4 px-3 py-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/5" />
        </div>
        <Skeleton className="hidden h-5 w-24 @2xl:block" />
        <Skeleton className="h-5 w-28" />
      </div>
    ))}
  </div>
);

/**
 * Los formatos y los listados del proyecto (`03 §2.3`, decisiones de interfaz
 * §6).
 *
 * La pestaña, la búsqueda y los filtros viven en la URL. Qué acciones lleva
 * cada fila lo decide `formRowActions`; aquí sólo se pintan y se ejecutan.
 */
export const FormsList = () => {
  const projectId = useProjectId();
  const router = useRouter();
  const { can } = usePermissions();
  const [view, setView] = useFormsListView();
  const kind = KIND_BY_CLASS[view.clase];

  const search = useDebounce(view.buscar, 500).trim();

  const { data: categories, isLoading: isLoadingCategories } =
    useGetFormCategories({ projectId });
  // La dirección la escribe cualquiera: una categoría que no es del proyecto
  // se ignora en vez de llegar al servidor como un id inválido.
  const category = categories?.find((item) => item._id === view.categoria);
  const waitsForCategory = view.categoria !== "" && isLoadingCategories;

  const { data: forms, isLoading } = useGetForms(
    waitsForCategory
      ? "skip"
      : {
          projectId,
          kind,
          ...(search ? { search } : {}),
          ...(category ? { categoryId: category._id } : {}),
          ...(view.archivados ? { includeArchived: true } : {}),
        },
  );

  const { mutate: duplicateForm, isPending: isDuplicating } =
    useDuplicateForm();
  const { mutate: archiveForm, isPending: isArchiving } = useArchiveForm();
  const { mutate: unarchiveForm, isPending: isUnarchiving } =
    useUnarchiveForm();
  const { mutate: removeForm, isPending: isRemoving } = useRemoveForm();
  const isBusy = isDuplicating || isArchiving || isUnarchiving || isRemoving;

  const [prompt, setPrompt] = useState<{
    title: string;
    message: string;
    type: "warning" | "critical";
    confirmText: string;
  }>({ title: "", message: "", type: "warning", confirmText: "Confirmar" });
  const [ConfirmDialog, confirm] = useConfirm(prompt);

  const canCreate = can(["createForms"]);
  const keys: FormViewerKeys = {
    createForms: canCreate,
    deleteForms: can(["deleteForms"]),
    fillForms: can(["fillForms"]),
    viewResponses: can(["viewResponses"]),
    editCatalogs: can(["editCatalogs"]),
  };

  const rows = forms ?? [];
  const noun = KIND_TEXT[kind].one;
  const hasCategories = (categories?.length ?? 0) > 0;
  const isFiltering = search !== "" || category !== undefined;

  const hrefOf = (form: FormRow, key: FormRowLinkKey) => {
    switch (key) {
      case "fill":
        return formRoutes.fill(projectId, form._id);
      case "addEntry":
        return formRoutes.newEntry(projectId, form._id);
      case "responses":
        return formRoutes.responses(projectId, form._id);
      case "results":
        return formRoutes.results(projectId, form._id);
      case "edit":
        return formRoutes.edit(projectId, form._id);
    }
  };

  const handleAction = async (
    form: FormRow,
    key: Exclude<FormRowActionKey, FormRowLinkKey>,
  ) => {
    const onError = (error: Error) => handleConvexErrorCallback(error);

    if (key === "duplicate") {
      duplicateForm(
        { id: form._id },
        {
          onSuccess: (id) => {
            toast.success(
              `${KIND_TEXT[kind].title} duplicado correctamente`,
            );
            router.push(formRoutes.edit(projectId, id));
          },
          onError,
        },
      );
      return;
    }

    if (key === "unarchive") {
      unarchiveForm(
        { id: form._id },
        {
          onSuccess: () => toast.success(`«${form.name}» se reactivó`),
          onError,
        },
      );
      return;
    }

    if (key === "archive") {
      setPrompt({
        title: `Archivar «${form.name}»`,
        message:
          kind === "record"
            ? "Sale de «Para diligenciar» y de esta lista, y conserva todas sus respuestas. Se puede reactivar después."
            : kind === "tracking"
              ? "Deja de admitir asuntos nuevos y sale de esta lista. Los que ya están abiertos se pueden seguir completando. Se puede reactivar después."
              : "Deja de ofrecerse para añadir elementos y sale de esta lista, y conserva todos sus elementos. Se puede reactivar después.",
        type: "warning",
        confirmText: "Archivar",
      });
      if (!(await confirm())) return;
      archiveForm(
        { id: form._id },
        {
          onSuccess: () => toast.success(`«${form.name}» se archivó`),
          onError,
        },
      );
      return;
    }

    setPrompt({
      title: `Eliminar «${form.name}»`,
      message: `Se elimina el ${noun} con todas sus versiones. Esta acción no se puede deshacer.`,
      type: "critical",
      confirmText: "Eliminar",
    });
    if (!(await confirm())) return;
    removeForm(
      { id: form._id },
      {
        onSuccess: () =>
          toast.success(
            `${KIND_TEXT[kind].title} eliminado correctamente`,
          ),
        onError,
      },
    );
  };

  /** El nombre lleva a lo que quien mira viene a hacer; sin nada que hacer,
   *  es sólo un nombre. */
  const withPrimaryLink = (
    form: FormRow,
    className: string,
    children: ReactNode,
  ) => {
    const primary = primaryRowAction(form, keys);
    return primary ? (
      <Link
        href={hrefOf(form, primary)}
        className={cn(
          className,
          "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        )}
      >
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );
  };

  /** Diligenciar, a la vista en la fila de quien al pulsarla abre el formato:
   *  no tiene que entrar para empezar una respuesta. */
  const fillOf = (form: FormRow, compact: boolean) =>
    canFillNow(form) && primaryRowAction(form, keys) !== "fill" ? (
      <Button size={compact ? "iconSm" : "sm"} variant="outline" asChild>
        {/* Un enlace no se deshabilita con `disabled`: se apaga a mano. */}
        <Link
          href={formRoutes.fill(projectId, form._id)}
          aria-label={`Diligenciar ${form.name}`}
          aria-disabled={isBusy}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <FORM_ACTION_ICONS.fill />
          {compact ? null : "Diligenciar"}
        </Link>
      </Button>
    ) : null;

  const menuOf = (form: FormRow) => (
    <FormRowMenu
      name={form.name}
      kind={form.kind}
      actions={formRowActions(form, keys)}
      hrefOf={(key) => hrefOf(form, key)}
      disabled={isBusy}
      onAction={(key) => handleAction(form, key)}
    />
  );

  /** Código y descripción en la segunda línea: aprovechan el ancho de la
   *  columna del nombre en vez de pedir una columna más. */
  const secondLine = (form: FormRow) =>
    [form.code, form.description].filter(Boolean).join(" · ");

  return (
    <Tabs
      value={view.clase}
      onValueChange={(value) => setView({ clase: value as FormClass })}
      // Los cortes se miden contra el espacio que deja el menú lateral, no
      // contra la ventana (`03 §2.3`).
      className="@container gap-3"
    >
      <ConfirmDialog />

      <div className="flex flex-col gap-2 @6xl:flex-row @6xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <TabsList>
            {FORM_CLASSES.map((formClass) => (
              <TabsTrigger key={formClass} value={formClass}>
                {CLASS_LABEL[formClass]}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* El conteo espera a saberlo, y va junto a las pestañas, como
              dato, no entre los controles (`03 §2.3`). */}
          {!isLoading && rows.length > 0 ? (
            <p className="truncate text-ui tabular-nums text-muted-foreground">
              {countForms(rows.length, kind)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 @xl:flex-row @xl:flex-wrap @xl:items-center @6xl:ml-auto">
          <div className="relative min-w-0 @xl:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nombre o código"
              aria-label="Buscar por nombre o código"
              value={view.buscar}
              onChange={(event) =>
                setView({ buscar: event.target.value || null })
              }
            />
          </div>
          <div className="flex items-center gap-3">
            {hasCategories ? (
              <SearchableSelect
                aria-label="Filtrar por categoría"
                className="min-w-0 flex-1 @xl:w-52 @xl:flex-none"
                align="end"
                searchPlaceholder="Buscar una categoría…"
                value={category?._id ?? ALL_CATEGORIES}
                options={[
                  { value: ALL_CATEGORIES, label: "Todas las categorías" },
                  ...(categories ?? []).map((item) => ({
                    value: item._id as string,
                    label: item.name,
                  })),
                ]}
                onValueChange={(value) =>
                  setView({
                    categoria: value === ALL_CATEGORIES ? null : value,
                  })
                }
              />
            ) : null}
            <label className="flex shrink-0 items-center gap-2 text-ui text-muted-foreground">
              <Switch
                checked={view.archivados}
                onCheckedChange={(checked) =>
                  setView({ archivados: checked ? true : null })
                }
              />
              Mostrar archivados
            </label>
          </div>
        </div>
      </div>

      <TabsContent
        value={view.clase}
        className="overflow-hidden rounded-lg border bg-card"
      >
        {isLoading ? (
          <ListLoading />
        ) : rows.length === 0 ? (
          isFiltering ? (
            <CollectionEmpty
              icon={Search}
              title={
                search
                  ? `Nada coincide con «${search}»`
                  : `Ningún ${noun} tiene la categoría «${category?.name}»`
              }
              hint="Prueba con otra palabra o quita el filtro."
            />
          ) : (
            <CollectionEmpty
              icon={KIND_ICON[kind]}
              title={`Todavía no hay ${noun}s.`}
              hint={
                canCreate
                  ? "Crea el primero."
                  : kind === "record"
                    ? "Cuando haya uno para ti, aparecerá aquí."
                    : "Cuando se publique uno, aparecerá aquí."
              }
            />
          )
        ) : (
          <>
            {/* Con sitio para las columnas: la tabla. */}
            <div className="hidden @2xl:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={HEAD_CLASS}>Nombre</TableHead>
                    {/* Sin sitio para la categoría, viaja en la segunda
                        línea del nombre. */}
                    {hasCategories ? (
                      <TableHead
                        className={cn(
                          HEAD_CLASS,
                          "hidden w-44 @4xl:table-cell @7xl:w-64",
                        )}
                      >
                        Categoría
                      </TableHead>
                    ) : null}
                    <TableHead className={cn(HEAD_CLASS, "w-48 @7xl:w-72")}>
                      Estado
                    </TableHead>
                    <TableHead className={cn(HEAD_CLASS, "w-28 text-right")}>
                      {KIND_TEXT[kind].itemsLabel}
                    </TableHead>
                    <TableHead
                      className={cn(
                        HEAD_CLASS,
                        kind === "record" ? "w-24 @5xl:w-44" : "w-14",
                      )}
                    >
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((form) => (
                    <TableRow key={form._id}>
                      <TableCell className="px-3 py-2.5 whitespace-normal">
                        {withPrimaryLink(
                          form,
                          "block min-w-0",
                          <>
                            <span
                              className={cn(
                                "block truncate text-sm font-medium",
                                form.status === "archived" &&
                                  "text-muted-foreground",
                              )}
                              title={form.name}
                            >
                              {form.name}
                            </span>
                            {secondLine(form) ? (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {secondLine(form)}
                              </span>
                            ) : null}
                            {hasCategories && form.categoryName ? (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground @4xl:hidden">
                                {form.categoryName}
                              </span>
                            ) : null}
                          </>,
                        )}
                      </TableCell>
                      {hasCategories ? (
                        <TableCell className="hidden truncate px-3 text-ui text-muted-foreground @4xl:table-cell">
                          {form.categoryName ?? (
                            <span className="text-muted-foreground/60">
                              Sin categoría
                            </span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="px-3 whitespace-normal">
                        <StatusBadges form={form} />
                      </TableCell>
                      <TableCell className="px-3 text-right text-sm tabular-nums">
                        {form.publishedVersionNumber === null ? (
                          <span className="text-muted-foreground/60">—</span>
                        ) : (
                          formatCount(form.responseCount)
                        )}
                      </TableCell>
                      <TableCell className="px-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="contents @5xl:hidden">
                            {fillOf(form, true)}
                          </span>
                          <span className="hidden @5xl:contents">
                            {fillOf(form, false)}
                          </span>
                          {menuOf(form)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Sin él: una fila pulsable por formato. */}
            <ul className="divide-y divide-border/60 @2xl:hidden">
              {rows.map((form) => (
                <li
                  key={form._id}
                  className="flex min-h-14 items-center gap-1 pr-1"
                >
                  {withPrimaryLink(
                    form,
                    "block min-w-0 flex-1 space-y-1 px-3 py-3",
                    <>
                      <span
                        className={cn(
                          "line-clamp-2 text-sm font-medium",
                          form.status === "archived" && "text-muted-foreground",
                        )}
                      >
                        {form.name}
                      </span>
                      {form.code || form.categoryName ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {[form.code, form.categoryName]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                      <StatusBadges form={form} />
                    </>,
                  )}
                  {fillOf(form, true)}
                  {menuOf(form)}
                </li>
              ))}
            </ul>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};
