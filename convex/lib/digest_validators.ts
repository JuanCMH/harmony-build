/** Los validadores de Convex de las formas de `response_digest.ts`. Van
 *  aparte porque ese módulo es puro. */

import { v } from "convex/values";

const digestValue = v.union(
  v.object({ kind: v.literal("text"), value: v.string() }),
  v.object({ kind: v.literal("number"), value: v.number() }),
  v.object({ kind: v.literal("boolean"), value: v.boolean() }),
  v.object({ kind: v.literal("list"), value: v.array(v.string()) }),
  v.object({
    kind: v.literal("reference"),
    responseId: v.string(),
    label: v.string(),
  }),
  v.object({
    kind: v.literal("tally"),
    ok: v.number(),
    failed: v.array(v.string()),
  }),
);

export const digestRows = v.array(
  v.object({
    responseId: v.id("formResponses"),
    values: v.array(v.object({ fieldId: v.string(), value: digestValue })),
  }),
);
