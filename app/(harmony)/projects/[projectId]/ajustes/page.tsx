"use client";

import { ProjectIdentity } from "@/packages/projects/components/project-identity";
import { ProjectSettingsPage } from "@/packages/projects/components/project-settings-page";

/** General: qué proyecto es este. Es donde aterriza quien abre ajustes. */
export default function ProjectSettingsGeneralPage() {
  return (
    <ProjectSettingsPage area="general">
      <ProjectIdentity />
    </ProjectSettingsPage>
  );
}
