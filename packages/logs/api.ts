import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";

const routeLogs = api.logs;

/** Admite `"skip"`: la consulta **lanza** sin la llave `viewLogs`, así que
 *  quien no la tiene no debe pedirla. */
export const useGetLogsByProject = (
  data: typeof routeLogs.getByProject._args | "skip",
) => useFetch(routeLogs.getByProject, data);

export const useGetLogDetails = (data: typeof routeLogs.getLogDetails._args) =>
  useFetch(routeLogs.getLogDetails, data);
