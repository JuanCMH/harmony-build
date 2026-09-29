"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentMember } from "@/packages/members/api";
import { useMemo } from "react";

/**
 * Quién diligencia: su id, para las reglas que miran `@autor`, y su nombre,
 * que firma los campos de firma del autor. `undefined` mientras carga, `null`
 * si no es miembro del proyecto.
 */
export function useCaptureAuthor(
  projectId: Id<"projects">,
): { id: string; name: string } | null | undefined {
  const { data: member } = useCurrentMember({ projectId });
  const id = member?.user?._id;
  const name = member?.user?.name?.trim() || member?.user?.email || "";

  return useMemo(() => {
    if (member === undefined) return undefined;
    return id ? { id, name } : null;
  }, [member, id, name]);
}
