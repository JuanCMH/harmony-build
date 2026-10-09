import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";
import { useMutate } from "@/hooks/use-mutate";

/** El único acceso a Convex del tablero (`01 §2`). */

/** El tablero del proyecto. `null` sin `viewResponses`. */
export const useGetDashboard = (
  data: typeof api.dashboards.get._args | "skip",
) => useFetch(api.dashboards.get, data);

export const useSaveDashboard = () => useMutate(api.dashboards.save);
