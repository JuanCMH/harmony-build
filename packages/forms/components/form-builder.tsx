"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { flattenFields, sortSections } from "@/convex/lib/form_evaluation";
import { FORM_CONTEXT_FIELDS } from "@/convex/lib/form_context";
import {
  FORM_LIMITS,
  type FieldType,
  type FormField,
  type FormSection,
} from "@/convex/lib/form_types";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { cn } from "@/lib/utils";
import { useGetMembers } from "@/packages/members/api";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Archive, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useDiscardFormDraft,
  useGetForm,
  useGetFormDraft,
  useGetPublishedForm,
  useListCatalogs,
  usePublishForm,
  useSaveFormDraft,
} from "../api";
import { builderProblems } from "../lib/builder-problems";
import {
  appendSection,
  duplicateFieldInPlace,
  insertField,
  moveSection,
  removeField,
  removeSection,
  reorderField,
  sectionsFingerprint,
  summarizeSections,
  updateField,
  updateSection,
} from "../lib/builder-sections";
import { FIELD_CATALOG } from "../lib/field-catalog";
import { duplicateSection, newField, newSection } from "../lib/field-defaults";
import { builderContextFields } from "../lib/field-rules";
import { formRoutes } from "../lib/routes";
import {
  formStatusBadge,
  hasUnpublishedChanges,
  UNPUBLISHED_CHANGES_BADGE,
} from "../lib/status";
import { useFieldBehaviorSheet } from "../store/use-field-behavior-sheet";
import { useFormId } from "../store/use-form-id";
import type { CanvasDragData } from "./form-canvas";
import { FormCanvas } from "./form-canvas";
import { FormBuilderActions, FormBuilderStatus } from "./form-builder-actions";
import { FormBuilderAside } from "./form-builder-aside";
import { type PaletteDragData, PaletteDragPreview } from "./form-field-palette";
import { FormTabs } from "./form-tabs";
import { FormSectionTabs } from "./form-section-tabs";
import { FieldBehaviorSheet } from "./sheets/field-behavior-sheet";
import { FieldTypeSheet } from "./sheets/field-type-sheet";
import { FormDetailsSheet } from "./sheets/form-details-sheet";
import { SectionVisibilitySheet } from "./sheets/section-visibility-sheet";

/**
 * El constructor de un formato o de un listado.
 *
 * Todo el borrador vive en memoria y se guarda de una vez: el formato es un
 * documento, no un grafo de filas, así que reordenar arrastrando no deja
 * estados a medias. «Guardar borrador» lo guarda sin que nadie lo vea;
 * «Publicar» lo convierte en la versión que se diligencia. Lo que está mal se
 * dice mientras se edita, todo junto en la cabecera, y con un solo problema el
 * borrador no se guarda.
 */
export const FormBuilder = () => {
  const projectId = useProjectId();
  const formId = useFormId();
  const { data: project } = useGetProject({ id: projectId });
  const { data: form, isLoading: isLoadingForm } = useGetForm({ id: formId });
  const canEdit = !!form?.canEdit && form.status !== "archived";
  const { data: draft } = useGetFormDraft(canEdit ? { id: formId } : "skip");
  const { data: published } = useGetPublishedForm(
    form?.publishedVersionId ? { id: formId } : "skip",
  );
  const { data: catalogs } = useListCatalogs(canEdit ? { projectId } : "skip");
  const { data: members } = useGetMembers({ projectId });

  const { mutate: saveDraft, isPending: isSaving } = useSaveFormDraft();
  const { mutate: publish, isPending: isPublishing } = usePublishForm();
  const { mutate: discardDraft, isPending: isDiscarding } =
    useDiscardFormDraft();
  const isBusy = isSaving || isPublishing || isDiscarding;

  const [sections, setSections] = useState<FormSection[]>([]);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [draggingType, setDraggingType] = useState<FieldType | null>(null);
  const [, setBehavior] = useFieldBehaviorSheet();

  const fingerprint = useMemo(() => sectionsFingerprint(sections), [sections]);
  const isDirty = baseline !== null && fingerprint !== baseline;

  const loadSections = (next: readonly FormSection[]) => {
    const ordered = sortSections(next);
    setSections(ordered);
    setBaseline(sectionsFingerprint(ordered));
    // Si la sección abierta ya no está —otra persona guardó mientras tanto—,
    // se abre la primera en vez de dejar el lienzo vacío.
    setActiveSectionId((current) =>
      current && ordered.some((section) => section.id === current)
        ? current
        : (ordered[0]?.id ?? null),
    );
  };

  // Lo que llega del servidor sustituye al borrador en memoria sólo si no hay
  // cambios sin guardar: otra pestaña que guarda no se lleva lo que se está
  // escribiendo aquí.
  useEffect(() => {
    if (!draft) return;
    const server = sectionsFingerprint(draft.sections);
    if (baseline === null || !isDirty) loadSections(draft.sections);
    else if (server === fingerprint) setBaseline(server);
  }, [draft]);

  // Salir con cambios sin guardar los pierde: el navegador lo pregunta.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const allFields = useMemo(() => flattenFields(sections), [sections]);
  const contextFields = useMemo(
    () =>
      builderContextFields(
        FORM_CONTEXT_FIELDS,
        (members ?? []).map((member) => ({
          value: member.userId,
          label: member.user.name ?? member.user.email ?? "Sin nombre",
        })),
      ),
    [members],
  );
  const ruleFields = useMemo(
    () => [...contextFields, ...allFields],
    [contextFields, allFields],
  );
  const catalogNames = useMemo(
    () =>
      new Map(
        (catalogs ?? []).map((catalog) => [
          catalog._id as string,
          catalog.name,
        ]),
      ),
    [catalogs],
  );
  const problems = useMemo(
    () =>
      builderProblems(sections, {
        kind: form?.kind ?? "record",
        titleFieldId: form?.titleFieldId,
      }),
    [sections, form?.kind, form?.titleFieldId],
  );
  const publishedFieldIds = useMemo(
    () =>
      new Set(
        published
          ? flattenFields(published.sections).map((field) => field.id)
          : [],
      ),
    [published],
  );

  const section =
    sections.find((candidate) => candidate.id === activeSectionId) ?? null;
  const selectedField =
    allFields.find((field) => field.id === selectedFieldId) ?? null;
  const isFull = allFields.length >= FORM_LIMITS.maxFields;

  const [confirmCopy, setConfirmCopy] = useState({
    title: "",
    message: "",
    action: "",
  });
  const [ConfirmDialog, confirm] = useConfirm({
    title: confirmCopy.title,
    message: confirmCopy.message,
    type: "warning",
    confirmText: confirmCopy.action,
  });
  const ask = async (title: string, message: string, action: string) => {
    setConfirmCopy({ title, message, action });
    return !!(await confirm());
  };

  /* ─────────────────────────────── Edición ─────────────────────────────── */

  const changeField = (next: FormField) =>
    setSections((current) => updateField(current, next));

  const changeSection = (sectionId: string, patch: Partial<FormSection>) =>
    setSections((current) => updateSection(current, sectionId, patch));

  const addField = (type: FieldType, beforeFieldId?: string) => {
    if (!section || isFull) return;
    const field = newField(type, FIELD_CATALOG[type].label);
    setSections((current) =>
      insertField(current, field, { sectionId: section.id, beforeFieldId }),
    );
    // El campo nuevo **no** se elige: la columna de la derecha alterna entre
    // la paleta y la configuración, y elegirlo cerraba la paleta después de
    // cada campo. Se montan primero los campos y luego se configuran.
  };

  const duplicateSelected = (fieldId: string) => {
    if (isFull) return;
    const result = duplicateFieldInPlace(sections, fieldId);
    if (!result) return;
    setSections(result.sections);
    setSelectedFieldId(result.copyId);
  };

  const removeFieldAsked = async (fieldId: string) => {
    const field = allFields.find((candidate) => candidate.id === fieldId);
    // Un campo que ya se diligencia se quita con aviso; uno recién añadido,
    // sin preguntar.
    if (
      field &&
      publishedFieldIds.has(fieldId) &&
      !(await ask(
        `Quitar «${field.label}»`,
        "Las respuestas que ya lo tienen lo conservan; las nuevas dejarán de pedirlo cuando publiques.",
        "Quitar",
      ))
    ) {
      return;
    }
    setSections((current) => removeField(current, fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const addSection = () => {
    if (sections.length >= FORM_LIMITS.maxSections) return;
    const created = newSection(sections.length + 1);
    setSections((current) => appendSection(current, created));
    setActiveSectionId(created.id);
    setSelectedFieldId(null);
  };

  const duplicateSectionById = (sectionId: string) => {
    const original = sections.find((candidate) => candidate.id === sectionId);
    if (!original || sections.length >= FORM_LIMITS.maxSections) return;
    const copy = duplicateSection(original, sections.length + 1);
    setSections((current) => appendSection(current, copy));
    setActiveSectionId(copy.id);
    setSelectedFieldId(null);
  };

  const removeSectionAsked = async (sectionId: string) => {
    const target = sections.find((candidate) => candidate.id === sectionId);
    if (!target) return;
    const count = target.fields.length;
    if (
      count > 0 &&
      !(await ask(
        `Eliminar «${target.label}»`,
        `Se quitan también sus ${count === 1 ? "un campo" : `${count} campos`}. Las respuestas que ya los tienen los conservan.`,
        "Eliminar",
      ))
    ) {
      return;
    }
    const rest = removeSection(sections, sectionId);
    setSections(rest);
    setActiveSectionId(rest[0]?.id ?? null);
    setSelectedFieldId(null);
  };

  /** Desde el resumen de reglas: elige el campo y abre su comportamiento en
   *  la pestaña que lleva sus reglas. */
  const openRules = (field: FormField) => {
    const owner = sections.find((candidate) =>
      candidate.fields.some((current) => current.id === field.id),
    );
    if (owner) setActiveSectionId(owner.id);
    setSelectedFieldId(field.id);
    setBehavior({
      fieldId: field.id,
      focus: field.config.visibility?.rules.length
        ? "visibility"
        : field.config.computed
          ? "value"
          : "autoValue",
    });
  };

  /* ─────────────────────────── Arrastrar y soltar ──────────────────────── */

  const sensors = useSensors(
    // Ocho píxeles antes de considerar que se arrastra: sin ese margen, un
    // clic en la paleta se interpretaba como el principio de un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as PaletteDragData | undefined;
    setDraggingType(data?.source === "palette" ? data.type : null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingType(null);
    const { active, over } = event;
    if (!over || !section) return;
    const activeData = active.data.current as
      | PaletteDragData
      | CanvasDragData
      | undefined;
    // `over` es un campo del lienzo o el lienzo entero.
    const overField = section.fields.some((field) => field.id === over.id)
      ? String(over.id)
      : undefined;

    if (activeData?.source === "palette") {
      addField(activeData.type, overField);
      return;
    }
    if (overField && active.id !== over.id) {
      setSections((current) =>
        reorderField(current, section.id, String(active.id), overField),
      );
    }
  };

  /* ───────────────────────────── Guardar y publicar ────────────────────── */

  const save = async (): Promise<boolean> => {
    if (problems.save.length > 0) return false;
    const saved = sections;
    let ok = false;
    await saveDraft(
      { id: formId, sections: saved },
      {
        onSuccess: () => {
          ok = true;
          setBaseline(sectionsFingerprint(saved));
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
    return ok;
  };

  const handleSave = async () => {
    if (await save()) toast.success("Borrador guardado correctamente");
  };

  const handlePublish = async () => {
    if (isDirty && !(await save())) return;
    await publish(
      { id: formId },
      {
        onSuccess: (version) =>
          toast.success(`Publicado correctamente: versión ${version}`),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const handleDiscard = async () => {
    if (!form || !draft) return;
    // Sin un borrador guardado distinto de lo publicado —o sin versión
    // publicada a la que volver—, se descarta sólo lo que no se ha guardado,
    // sin tocar el servidor.
    if (!form.hasDraftChanges || !published) {
      if (
        await ask(
          "Descartar los cambios",
          "Se pierde lo que no has guardado y el formato vuelve al último borrador guardado.",
          "Descartar",
        )
      ) {
        loadSections(draft.sections);
      }
      return;
    }
    if (
      !(await ask(
        "Descartar los cambios",
        `El formato vuelve a la versión publicada (v${form.publishedVersionNumber}). Se pierden el borrador guardado y lo que no has guardado.`,
        "Descartar",
      ))
    ) {
      return;
    }
    const restored = published.sections;
    await discardDraft(
      { id: formId },
      {
        onSuccess: () => {
          loadSections(restored);
          setSelectedFieldId(null);
          toast.success("Cambios descartados correctamente");
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  /* ──────────────────────────────── Pintar ─────────────────────────────── */

  const listKind = form?.kind ?? "record";
  const breadcrumb = project
    ? [
        { label: project.name, href: `/projects/${projectId}` },
        {
          label: listKind === "catalog" ? "Listados" : "Formatos",
          href: formRoutes.list(projectId, listKind),
        },
        { label: form?.name ?? "Constructor" },
      ]
    : [];

  const hasChanges = isDirty || !!form?.hasDraftChanges;
  const canPublish =
    hasChanges || form?.status === "draft"
      ? problems.save.length === 0 && problems.publish.length === 0
      : false;
  const canDiscard = isDirty || (!!form?.hasDraftChanges && !!published);
  // Un solo estado: «Cambios sin publicar» sustituye a «Publicado · v1»
  // porque es lo que hay que hacer; dos insignias se comían las migas.
  const statusBadges = form
    ? [
        hasUnpublishedChanges(form) || (form.status === "published" && isDirty)
          ? UNPUBLISHED_CHANGES_BADGE
          : formStatusBadge(form),
      ]
    : [];

  if (!isLoadingForm && (!form || !canEdit)) {
    return (
      <PageShell>
        <PageHeader breadcrumb={breadcrumb} />
        <PageMain variant="editor">
          <PageLoading
            icon={form?.status === "archived" ? Archive : Lock}
            text={
              form?.status === "archived"
                ? "El formato está archivado: reactívalo desde la lista para cambiarlo."
                : "No tienes permiso para editar este formato. Pídeselo a quien administra el proyecto."
            }
          />
        </PageMain>
      </PageShell>
    );
  }

  // Quien diseña ve además las respuestas si las consulta o si diligencia.
  const hasFormTabs = !!form && (form.canViewAll || form.canFill);

  return (
    <PageShell>
      <ConfirmDialog />
      <FieldBehaviorSheet fields={ruleFields} onChange={changeField} />
      <FieldTypeSheet
        fields={allFields}
        kind={listKind}
        formId={formId}
        onChange={changeField}
      />
      <SectionVisibilitySheet
        sections={sections}
        contextFields={contextFields}
        onChange={changeSection}
      />
      {form ? (
        <FormDetailsSheet
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          form={form}
        />
      ) : null}

      <PageHeader
        breadcrumb={breadcrumb}
        actions={
          <FormBuilderActions
            kind={listKind}
            problems={problems}
            canSave={isDirty && problems.save.length === 0}
            canPublish={canPublish}
            canDiscard={canDiscard}
            isSaving={isSaving}
            isPublishing={isPublishing}
            isBusy={isBusy}
            publishHint={
              hasChanges || form?.status === "draft"
                ? undefined
                : "No hay cambios que publicar"
            }
            onGoToProblem={(problem) => {
              if (problem.sectionId) setActiveSectionId(problem.sectionId);
              setSelectedFieldId(problem.fieldId ?? null);
            }}
            onOpenDetails={() => setIsDetailsOpen(true)}
            onDiscard={handleDiscard}
            onSave={handleSave}
            onPublish={handlePublish}
          />
        }
      >
        <FormBuilderStatus badges={statusBadges} />
      </PageHeader>
      {form && hasFormTabs ? (
        <FormTabs
          formId={formId}
          active="design"
          form={form}
          canList={hasFormTabs}
          hasUnsavedChanges={isDirty}
        />
      ) : null}

      <PageMain
        variant="editor"
        // Las pestañas del formato ocupan 2,5rem más bajo la cabecera.
        className={hasFormTabs ? "lg:h-[calc(100svh-6.5rem)]" : undefined}
        isLoading={isLoadingForm || baseline === null}
        loadingText="Se está cargando el formato."
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDraggingType(null)}
        >
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b px-4 py-2">
                <FormSectionTabs
                  sections={sections}
                  activeSectionId={activeSectionId}
                  summary={summarizeSections(sections)}
                  canAdd={sections.length < FORM_LIMITS.maxSections}
                  onSelect={(id) => {
                    setActiveSectionId(id);
                    setSelectedFieldId(null);
                  }}
                  onAdd={addSection}
                  onRename={(id, label) => changeSection(id, { label })}
                  onMove={(id, offset) =>
                    setSections((current) => moveSection(current, id, offset))
                  }
                  onDuplicate={duplicateSectionById}
                  onRemove={removeSectionAsked}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
                {section ? (
                  <div className="mx-auto w-full max-w-5xl space-y-6">
                    {section.description ? (
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    ) : null}
                    <FormCanvas
                      section={section}
                      allFields={allFields}
                      selectedFieldId={selectedFieldId}
                      catalogNames={catalogNames}
                      onSelectField={setSelectedFieldId}
                      onDuplicateField={duplicateSelected}
                      onRemoveField={removeFieldAsked}
                    />
                  </div>
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    Crea una sección para empezar.
                  </p>
                )}
              </div>
            </div>

            <aside
              className={cn(
                "flex w-full shrink-0 flex-col gap-3 border-t p-4",
                "lg:w-96 lg:border-t-0 lg:border-l",
              )}
            >
              <FormBuilderAside
                kind={listKind}
                field={selectedField}
                section={section}
                fields={allFields}
                ruleFields={ruleFields}
                contextFields={contextFields}
                catalogNames={catalogNames}
                catalogTitle={
                  form?.kind === "catalog" && draft
                    ? {
                        formId,
                        titleFieldId: form.titleFieldId,
                        savedDraft: draft.sections,
                        published: published?.sections ?? null,
                      }
                    : null
                }
                hasUnsavedChanges={isDirty}
                isFull={isFull}
                onBack={() => setSelectedFieldId(null)}
                onChangeField={changeField}
                onChangeSection={changeSection}
                onAddField={(type) => addField(type)}
                onOpenRules={openRules}
              />
            </aside>
          </div>

          {/* Lo que se ve mientras se arrastra un tipo desde la paleta. */}
          <DragOverlay dropAnimation={null}>
            {draggingType ? <PaletteDragPreview type={draggingType} /> : null}
          </DragOverlay>
        </DndContext>
      </PageMain>
    </PageShell>
  );
};
