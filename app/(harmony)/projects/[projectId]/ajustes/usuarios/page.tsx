"use client";

import { MembersSection } from "@/packages/members/components/members-section";
import { MemberProfileModal } from "@/packages/members/components/modals/member-profile-modal";
import { useParentMemberId } from "@/packages/members/store/use-parent-member-id";
import { ProjectDefaultRole } from "@/packages/projects/components/project-default-role";
import { ProjectInviteModal } from "@/packages/projects/components/modals/project-invite-modal";
import { ProjectSettingsPage } from "@/packages/projects/components/project-settings-page";
import { useState } from "react";

export default function ProjectSettingsUsersPage() {
  // La ficha abierta vive en la URL: el enlace a un miembro se puede compartir.
  const [memberId, setMemberId] = useParentMemberId();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <ProjectSettingsPage area="users">
      <MembersSection
        onSelectMember={(id) => setMemberId(id)}
        onInvite={() => setInviteOpen(true)}
        beforeList={<ProjectDefaultRole />}
      />

      {memberId ? (
        <MemberProfileModal
          memberId={memberId}
          handleCloseMember={() => setMemberId(null)}
        />
      ) : null}
      {inviteOpen ? (
        <ProjectInviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
      ) : null}
    </ProjectSettingsPage>
  );
}
