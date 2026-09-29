import { useMutate } from "@/hooks/use-mutate";
import { api } from "@/convex/_generated/api";

const route = api.users;

export const useUpdateUserImage = () => useMutate(route.updateImage);

export const useUpdateUserName = () => useMutate(route.updateName);
