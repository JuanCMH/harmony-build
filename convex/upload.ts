import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const generatedUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Sin identidad, esto es una URL de escritura al storage del proyecto
    // abierta a cualquiera que conozca la URL del deployment.
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
