import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";
import { useMutate } from "@/hooks/use-mutate";

const route = api.projects;

export const useCreateProject = () => useMutate(route.create);

export const useUpdateProject = () => useMutate(route.update);

export const useTransferProject = () => useMutate(route.transfer);

export const useRemoveProject = () => useMutate(route.remove);

export const useJoinProject = () => useMutate(route.join);

export const useNewJoinCode = () => useMutate(route.newJoinCode);

/** Los proyectos a los que pertenece quien mira, con su rol en cada uno. */
export const useGetProjects = () => useFetch(route.get, {});

export const useGetProject = (data: typeof route.getById._args) =>
  useFetch(route.getById, data);

/** Devuelve `null` a quien no tiene la llave `inviteUsers`. */
export const useGetProjectJoinCode = (
  data: typeof route.getJoinCode._args | "skip",
) => useFetch(route.getJoinCode, data);

/** Admite `"skip"`: la consulta **lanza** si quien mira no es el propietario,
 *  así que quien no lo es no debe pedirla. */
export const useGetProjectDeletionImpact = (
  data: typeof route.getDeletionImpact._args | "skip",
) => useFetch(route.getDeletionImpact, data);

/** El rol que recibe quien entra con el código. Sin `roleId`, lo quita. Exige
 *  la llave `assignRoles`. */
export const useSetProjectDefaultRole = () => useMutate(route.setDefaultRole);
