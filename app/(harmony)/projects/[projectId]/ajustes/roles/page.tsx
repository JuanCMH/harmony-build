"use client";

import { ProjectSettingsPage } from "@/packages/projects/components/project-settings-page";
import { RolesSection } from "@/packages/roles/components/roles-section";

export default function ProjectSettingsRolesPage() {
  return (
    <ProjectSettingsPage area="roles">
      <RolesSection />
    </ProjectSettingsPage>
  );
}
