import type { Doc } from "@/convex/_generated/dataModel";
import { CirclePlus, Info, PencilLine, Trash2 } from "lucide-react";

/** El icono de cada tipo de registro, con su color de estado (`03 §1.4`). El
 *  color nunca va solo: la descripción del registro dice qué pasó. */
export const getLogTypeIcon = (type: Doc<"logs">["type"]) => {
  switch (type) {
    case "create":
      return <CirclePlus className="text-green-500" size={16} aria-hidden />;
    case "update":
      return <PencilLine className="text-yellow-500" size={16} aria-hidden />;
    case "delete":
      return <Trash2 className="text-red-500" size={16} aria-hidden />;
    case "info":
      return <Info className="text-gray-500" size={16} aria-hidden />;
  }
};
