import { Doc } from "@convex-dev/auth/server";

export type User = Omit<Doc<"users">, "image" | "mainImage"> & {
  userImage?: string | undefined;
};
