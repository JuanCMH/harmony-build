import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";
import { useMutate } from "@/hooks/use-mutate";

export const useCreateRole = () => useMutate(api.roles.create);

export const useUpdateRole = () => useMutate(api.roles.update);

export const useRemoveRole = () => useMutate(api.roles.remove);

export const useGetRoles = (data: typeof api.roles.get._args) =>
  useFetch(api.roles.get, data);
