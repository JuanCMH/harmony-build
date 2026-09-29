import type { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";

export const useResponseId = () => {
  const { responseId } = useParams<{ responseId: Id<"formResponses"> }>();
  return responseId;
};
