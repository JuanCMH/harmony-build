import type { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";

export const useFormId = () => {
  const { formId } = useParams<{ formId: Id<"forms"> }>();
  return formId;
};
