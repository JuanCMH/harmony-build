"use client";

import { CategoriesSection } from "@/packages/forms/components/categories-section";
import { ProjectSettingsPage } from "@/packages/projects/components/project-settings-page";

export default function ProjectSettingsCategoriesPage() {
  return (
    <ProjectSettingsPage area="categories">
      <CategoriesSection />
    </ProjectSettingsPage>
  );
}
