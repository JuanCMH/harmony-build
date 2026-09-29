"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import { Button } from "@/components/ui/button";
import { FormsList } from "@/packages/forms/components/forms-list";
import { CreateFormModal } from "@/packages/forms/components/modals/create-form-modal";
import {
  KIND_BY_CLASS,
  useFormsListView,
} from "@/packages/forms/store/use-forms-list-view";
import { useGetProject } from "@/packages/projects/api";
import { useProjectId } from "@/packages/projects/store/use-project-id";
import type { PermissionValue } from "@/packages/roles/lib/permissions";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { Lock, Plus } from "lucide-react";
import { useState } from "react";

/** Basta una para ver la lista; sin ninguna, el servidor no devuelve nada. */
const FORM_KEYS: PermissionValue[] = [
  "createForms",
  "editForms",
  "deleteForms",
  "fillForms",
  "viewResponses",
  "editCatalogs",
];

/** Los formatos y los listados del proyecto. La pestaña, la búsqueda y los
 *  filtros viven en la URL, así que la pantalla es enlazable. */
export default function ProjectFormsPage() {
  const projectId = useProjectId();
  const { data: project } = useGetProject({ id: projectId });
  const { can, isLoading } = usePermissions();
  const [{ clase }] = useFormsListView();
  const [createOpen, setCreateOpen] = useState(false);

  const kind = KIND_BY_CLASS[clase];

  return (
    <PageShell>
      <PageHeader
        breadcrumb={
          project
            ? [
                { label: project.name, href: `/projects/${projectId}` },
                { label: "Formatos" },
              ]
            : []
        }
        actions={
          can(["createForms"]) ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {kind === "record" ? "Crear formato" : "Crear listado"}
            </Button>
          ) : null
        }
      />
      <PageMain
        variant="listado"
        isLoading={isLoading}
        loadingText="Se están cargando los formatos."
      >
        {can(FORM_KEYS) ? (
          <FormsList />
        ) : (
          <PageLoading
            icon={Lock}
            text="No tienes permiso para ver los formatos de este proyecto. Pídeselo a quien lo administra."
          />
        )}
      </PageMain>

      {createOpen ? (
        <CreateFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultKind={kind}
        />
      ) : null}
    </PageShell>
  );
}
