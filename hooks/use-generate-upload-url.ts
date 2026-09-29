import { api } from "@/convex/_generated/api";
import { useMutate } from "./use-mutate";

const route = api.upload;

export const useGenerateUploadUrl = () => useMutate(route.generatedUploadUrl);
