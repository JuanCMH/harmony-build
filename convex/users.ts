import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeText } from "./lib/text";
import { usersErrors } from "./lib/error_messages";

export const updateImage = mutation({
  args: {
    newImageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(usersErrors.unauthorized);

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError(usersErrors.userNotFound);

    // Sin `await`, la promesa quedaba suelta y la imagen anterior podía
    // sobrevivir para siempre en el almacenamiento.
    if (user.mainImage) await ctx.storage.delete(user.mainImage);

    await ctx.db.patch(userId, {
      mainImage: args.newImageId,
    });

    return userId;
  },
});

export const updateName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError(usersErrors.unauthorized);

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError(usersErrors.userNotFound);

    const name = normalizeText(args.name);
    if (name.length < 4 || name.length > 40)
      throw new ConvexError(usersErrors.invalidName);

    await ctx.db.patch(userId, { name });

    return userId;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError(usersErrors.userNotFound);

    const { image, mainImage, ...rest } = user;

    const userImage = user.mainImage
      ? await ctx.storage.getUrl(user.mainImage)
      : null;

    return {
      ...rest,
      userImage: userImage || image,
    };
  },
});
