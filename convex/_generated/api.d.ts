/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests___helpers from "../__tests__/helpers.js";
import type * as auth from "../auth.js";
import type * as colors from "../colors.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_error_messages from "../lib/error_messages.js";
import type * as lib_join_codes from "../lib/join_codes.js";
import type * as lib_password_policy from "../lib/password_policy.js";
import type * as lib_text from "../lib/text.js";
import type * as logs from "../logs.js";
import type * as members from "../members.js";
import type * as permissions from "../permissions.js";
import type * as projects from "../projects.js";
import type * as resend from "../resend.js";
import type * as roles from "../roles.js";
import type * as upload from "../upload.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/helpers": typeof __tests___helpers;
  auth: typeof auth;
  colors: typeof colors;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/error_messages": typeof lib_error_messages;
  "lib/join_codes": typeof lib_join_codes;
  "lib/password_policy": typeof lib_password_policy;
  "lib/text": typeof lib_text;
  logs: typeof logs;
  members: typeof members;
  permissions: typeof permissions;
  projects: typeof projects;
  resend: typeof resend;
  roles: typeof roles;
  upload: typeof upload;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
