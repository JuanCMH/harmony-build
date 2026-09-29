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
import type * as formCategories from "../formCategories.js";
import type * as formEntries from "../formEntries.js";
import type * as formFiles from "../formFiles.js";
import type * as formLibrary from "../formLibrary.js";
import type * as formResponses from "../formResponses.js";
import type * as formVersions from "../formVersions.js";
import type * as forms from "../forms.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_checklist_summary from "../lib/checklist_summary.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_entry_title from "../lib/entry_title.js";
import type * as lib_error_messages from "../lib/error_messages.js";
import type * as lib_field_computed from "../lib/field_computed.js";
import type * as lib_field_config_validation from "../lib/field_config_validation.js";
import type * as lib_field_logic from "../lib/field_logic.js";
import type * as lib_field_text from "../lib/field_text.js";
import type * as lib_form_access from "../lib/form_access.js";
import type * as lib_form_context from "../lib/form_context.js";
import type * as lib_form_details from "../lib/form_details.js";
import type * as lib_form_evaluation from "../lib/form_evaluation.js";
import type * as lib_form_references from "../lib/form_references.js";
import type * as lib_form_rows from "../lib/form_rows.js";
import type * as lib_form_store from "../lib/form_store.js";
import type * as lib_form_types from "../lib/form_types.js";
import type * as lib_form_validation from "../lib/form_validation.js";
import type * as lib_form_validators from "../lib/form_validators.js";
import type * as lib_form_values from "../lib/form_values.js";
import type * as lib_join_codes from "../lib/join_codes.js";
import type * as lib_password_policy from "../lib/password_policy.js";
import type * as lib_stored_values from "../lib/stored_values.js";
import type * as lib_text from "../lib/text.js";
import type * as lib_value_coercion from "../lib/value_coercion.js";
import type * as lib_value_validation from "../lib/value_validation.js";
import type * as logs from "../logs.js";
import type * as members from "../members.js";
import type * as permissions from "../permissions.js";
import type * as projects from "../projects.js";
import type * as resend from "../resend.js";
import type * as roles from "../roles.js";
import type * as sst_library___tests___readers from "../sst_library/__tests__/readers.js";
import type * as sst_library_builders from "../sst_library/builders.js";
import type * as sst_library_catalog_samples from "../sst_library/catalog_samples.js";
import type * as sst_library_catalogs from "../sst_library/catalogs.js";
import type * as sst_library_common from "../sst_library/common.js";
import type * as sst_library_forms_sst_f_007 from "../sst_library/forms/sst_f_007.js";
import type * as sst_library_forms_sst_f_010 from "../sst_library/forms/sst_f_010.js";
import type * as sst_library_forms_sst_f_031 from "../sst_library/forms/sst_f_031.js";
import type * as sst_library_forms_sst_f_038 from "../sst_library/forms/sst_f_038.js";
import type * as sst_library_forms_sst_f_046_a1 from "../sst_library/forms/sst_f_046_a1.js";
import type * as sst_library_forms_sst_f_046_a2 from "../sst_library/forms/sst_f_046_a2.js";
import type * as sst_library_forms_sst_f_046_a3 from "../sst_library/forms/sst_f_046_a3.js";
import type * as sst_library_forms_sst_f_046_a4 from "../sst_library/forms/sst_f_046_a4.js";
import type * as sst_library_forms_sst_f_046_a6 from "../sst_library/forms/sst_f_046_a6.js";
import type * as sst_library_forms_sst_f_065 from "../sst_library/forms/sst_f_065.js";
import type * as sst_library_forms_sst_f_066 from "../sst_library/forms/sst_f_066.js";
import type * as sst_library_forms_sst_f_074 from "../sst_library/forms/sst_f_074.js";
import type * as sst_library_forms_sst_f_075 from "../sst_library/forms/sst_f_075.js";
import type * as sst_library_forms_sst_f_080 from "../sst_library/forms/sst_f_080.js";
import type * as sst_library_forms_sst_f_083 from "../sst_library/forms/sst_f_083.js";
import type * as sst_library_forms_sst_f_090 from "../sst_library/forms/sst_f_090.js";
import type * as sst_library_forms_sst_f_115 from "../sst_library/forms/sst_f_115.js";
import type * as sst_library_forms_sst_f_116 from "../sst_library/forms/sst_f_116.js";
import type * as sst_library_forms_sst_f_118 from "../sst_library/forms/sst_f_118.js";
import type * as sst_library_index from "../sst_library/index.js";
import type * as sst_library_types from "../sst_library/types.js";
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
  formCategories: typeof formCategories;
  formEntries: typeof formEntries;
  formFiles: typeof formFiles;
  formLibrary: typeof formLibrary;
  formResponses: typeof formResponses;
  formVersions: typeof formVersions;
  forms: typeof forms;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/checklist_summary": typeof lib_checklist_summary;
  "lib/dates": typeof lib_dates;
  "lib/entry_title": typeof lib_entry_title;
  "lib/error_messages": typeof lib_error_messages;
  "lib/field_computed": typeof lib_field_computed;
  "lib/field_config_validation": typeof lib_field_config_validation;
  "lib/field_logic": typeof lib_field_logic;
  "lib/field_text": typeof lib_field_text;
  "lib/form_access": typeof lib_form_access;
  "lib/form_context": typeof lib_form_context;
  "lib/form_details": typeof lib_form_details;
  "lib/form_evaluation": typeof lib_form_evaluation;
  "lib/form_references": typeof lib_form_references;
  "lib/form_rows": typeof lib_form_rows;
  "lib/form_store": typeof lib_form_store;
  "lib/form_types": typeof lib_form_types;
  "lib/form_validation": typeof lib_form_validation;
  "lib/form_validators": typeof lib_form_validators;
  "lib/form_values": typeof lib_form_values;
  "lib/join_codes": typeof lib_join_codes;
  "lib/password_policy": typeof lib_password_policy;
  "lib/stored_values": typeof lib_stored_values;
  "lib/text": typeof lib_text;
  "lib/value_coercion": typeof lib_value_coercion;
  "lib/value_validation": typeof lib_value_validation;
  logs: typeof logs;
  members: typeof members;
  permissions: typeof permissions;
  projects: typeof projects;
  resend: typeof resend;
  roles: typeof roles;
  "sst_library/__tests__/readers": typeof sst_library___tests___readers;
  "sst_library/builders": typeof sst_library_builders;
  "sst_library/catalog_samples": typeof sst_library_catalog_samples;
  "sst_library/catalogs": typeof sst_library_catalogs;
  "sst_library/common": typeof sst_library_common;
  "sst_library/forms/sst_f_007": typeof sst_library_forms_sst_f_007;
  "sst_library/forms/sst_f_010": typeof sst_library_forms_sst_f_010;
  "sst_library/forms/sst_f_031": typeof sst_library_forms_sst_f_031;
  "sst_library/forms/sst_f_038": typeof sst_library_forms_sst_f_038;
  "sst_library/forms/sst_f_046_a1": typeof sst_library_forms_sst_f_046_a1;
  "sst_library/forms/sst_f_046_a2": typeof sst_library_forms_sst_f_046_a2;
  "sst_library/forms/sst_f_046_a3": typeof sst_library_forms_sst_f_046_a3;
  "sst_library/forms/sst_f_046_a4": typeof sst_library_forms_sst_f_046_a4;
  "sst_library/forms/sst_f_046_a6": typeof sst_library_forms_sst_f_046_a6;
  "sst_library/forms/sst_f_065": typeof sst_library_forms_sst_f_065;
  "sst_library/forms/sst_f_066": typeof sst_library_forms_sst_f_066;
  "sst_library/forms/sst_f_074": typeof sst_library_forms_sst_f_074;
  "sst_library/forms/sst_f_075": typeof sst_library_forms_sst_f_075;
  "sst_library/forms/sst_f_080": typeof sst_library_forms_sst_f_080;
  "sst_library/forms/sst_f_083": typeof sst_library_forms_sst_f_083;
  "sst_library/forms/sst_f_090": typeof sst_library_forms_sst_f_090;
  "sst_library/forms/sst_f_115": typeof sst_library_forms_sst_f_115;
  "sst_library/forms/sst_f_116": typeof sst_library_forms_sst_f_116;
  "sst_library/forms/sst_f_118": typeof sst_library_forms_sst_f_118;
  "sst_library/index": typeof sst_library_index;
  "sst_library/types": typeof sst_library_types;
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
