import { useFetch } from "@/hooks/use-fetch";
import { useMutate } from "@/hooks/use-mutate";
import { api } from "@/convex/_generated/api";

export const useUpdateMember = () => useMutate(api.members.update);

export const useRemoveMember = () => useMutate(api.members.remove);

export const useCurrentMember = (data: typeof api.members.current._args) =>
  useFetch(api.members.current, data);

export const useGetMember = (data: typeof api.members.getById._args) =>
  useFetch(api.members.getById, data);

export const useGetMembers = (data: typeof api.members.get._args) =>
  useFetch(api.members.get, data);
