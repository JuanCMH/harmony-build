import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";

export const useProjectId = () => {
  const { projectId } = useParams<{ projectId: Id<"projects"> }>();
  return projectId;
};
