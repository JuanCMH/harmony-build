import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { formCategoriesErrors } from "./lib/error_messages";
import { isSameName, normalizeText } from "./lib/text";
import { checkPermission, hasProjectAccess } from "./roles";

const NAME_MIN = 2;
const NAME_MAX = 40;

/** Cuántos formatos se cuentan antes de decir que una categoría está en uso.
 *  Basta con saber que son muchos (`01 §6`). */
const USAGE_COUNT_CAP = 100;

const projectCategories = (ctx: QueryCtx, projectId: Id<"projects">) =>
  ctx.db
    .query("formCategories")
    .withIndex("projectId", (q) => q.eq("projectId", projectId))
    .collect();

/** El nombre limpio, que no repite el de otra categoría del proyecto. «SST» y
 *  «sst» son la misma para quien las lee. */
async function validateName(
  ctx: QueryCtx,
  projectId: Id<"projects">,
  rawName: string,
  except?: Id<"formCategories">,
) {
  const name = normalizeText(rawName);
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    throw new ConvexError(formCategoriesErrors.invalidName);
  }
  const categories = await projectCategories(ctx, projectId);
  const taken = categories.some(
    (category) => category._id !== except && isSameName(category.name, name),
  );
  if (taken) throw new ConvexError(formCategoriesErrors.duplicateName);
  return name;
}

/** Las categorías del proyecto, por nombre. Las lee cualquier miembro: son el
 *  filtro de la lista de formatos, y no dicen nada de lo que hay dentro. */
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const hasAccess = await hasProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return null;

    const categories = await projectCategories(ctx, args.projectId);
    return categories.sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
});

export const create = mutation({
  args: { projectId: v.id("projects"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError(formCategoriesErrors.userNotAuthenticated);
    }

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "editForms",
      projectId: args.projectId,
    });
    if (!hasPermission) {
      throw new ConvexError(formCategoriesErrors.insufficientPermissions);
    }

    const name = await validateName(ctx, args.projectId, args.name);

    const id = await ctx.db.insert("formCategories", {
      projectId: args.projectId,
      name,
    });

    // Las categorías son un ajuste del proyecto: la entrada cuelga de él.
    await ctx.runMutation(internal.logs.create, {
      description: `Categoría de formatos creada: ${name}`,
      type: "create",
      projectId: args.projectId,
      affectedEntityType: "project",
      affectedEntityId: args.projectId,
    });

    return id;
  },
});

export const update = mutation({
  args: { id: v.id("formCategories"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError(formCategoriesErrors.userNotAuthenticated);
    }

    const category = await ctx.db.get(args.id);
    if (!category) throw new ConvexError(formCategoriesErrors.categoryNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "editForms",
      projectId: category.projectId,
    });
    if (!hasPermission) {
      throw new ConvexError(formCategoriesErrors.insufficientPermissions);
    }

    const name = await validateName(
      ctx,
      category.projectId,
      args.name,
      args.id,
    );

    await ctx.db.patch(args.id, { name });

    await ctx.runMutation(internal.logs.create, {
      description: `Categoría de formatos renombrada: ${category.name} → ${name}`,
      type: "update",
      projectId: category.projectId,
      affectedEntityType: "project",
      affectedEntityId: category.projectId,
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("formCategories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError(formCategoriesErrors.userNotAuthenticated);
    }

    const category = await ctx.db.get(args.id);
    if (!category) throw new ConvexError(formCategoriesErrors.categoryNotFound);

    const hasPermission = await checkPermission({
      ctx,
      userId,
      permission: "editForms",
      projectId: category.projectId,
    });
    if (!hasPermission) {
      throw new ConvexError(formCategoriesErrors.insufficientPermissions);
    }

    // `forms.categoryId` es opcional y se podría anular, pero quitarle la
    // categoría a veinte formatos de una vez es justo lo que nadie quiere
    // hacer sin darse cuenta: se niega y dice cuántos son.
    const using = await ctx.db
      .query("forms")
      .withIndex("categoryId", (q) => q.eq("categoryId", args.id))
      .take(USAGE_COUNT_CAP);
    if (using.length > 0) {
      throw new ConvexError(formCategoriesErrors.inUse(using.length));
    }

    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.logs.create, {
      description: `Categoría de formatos eliminada: ${category.name}`,
      type: "delete",
      projectId: category.projectId,
      affectedEntityType: "project",
      affectedEntityId: category.projectId,
    });

    return args.id;
  },
});
