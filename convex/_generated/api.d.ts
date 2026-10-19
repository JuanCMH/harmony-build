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
import type * as dashboards from "../dashboards.js";
import type * as demoData from "../demoData.js";
import type * as formCategories from "../formCategories.js";
import type * as formDigests from "../formDigests.js";
import type * as formEntries from "../formEntries.js";
import type * as formFiles from "../formFiles.js";
import type * as formImports from "../formImports.js";
import type * as formLibrary from "../formLibrary.js";
import type * as formResponses from "../formResponses.js";
import type * as formResults from "../formResults.js";
import type * as formTrackings from "../formTrackings.js";
import type * as formVersions from "../formVersions.js";
import type * as forms from "../forms.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_checklist_summary from "../lib/checklist_summary.js";
import type * as lib_date_buckets from "../lib/date_buckets.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_digest_validators from "../lib/digest_validators.js";
import type * as lib_entry_title from "../lib/entry_title.js";
import type * as lib_error_messages from "../lib/error_messages.js";
import type * as lib_field_computed from "../lib/field_computed.js";
import type * as lib_field_config_validation from "../lib/field_config_validation.js";
import type * as lib_field_logic from "../lib/field_logic.js";
import type * as lib_field_text from "../lib/field_text.js";
import type * as lib_form_access from "../lib/form_access.js";
import type * as lib_form_context from "../lib/form_context.js";
import type * as lib_form_details from "../lib/form_details.js";
import type * as lib_form_digests from "../lib/form_digests.js";
import type * as lib_form_evaluation from "../lib/form_evaluation.js";
import type * as lib_form_references from "../lib/form_references.js";
import type * as lib_form_rows from "../lib/form_rows.js";
import type * as lib_form_store from "../lib/form_store.js";
import type * as lib_form_types from "../lib/form_types.js";
import type * as lib_form_validation from "../lib/form_validation.js";
import type * as lib_form_validators from "../lib/form_validators.js";
import type * as lib_form_values from "../lib/form_values.js";
import type * as lib_import_types from "../lib/import_types.js";
import type * as lib_join_codes from "../lib/join_codes.js";
import type * as lib_password_policy from "../lib/password_policy.js";
import type * as lib_response_digest from "../lib/response_digest.js";
import type * as lib_result_compute from "../lib/result_compute.js";
import type * as lib_result_coverage from "../lib/result_coverage.js";
import type * as lib_result_definition from "../lib/result_definition.js";
import type * as lib_result_tracking from "../lib/result_tracking.js";
import type * as lib_result_types from "../lib/result_types.js";
import type * as lib_result_validators from "../lib/result_validators.js";
import type * as lib_stored_values from "../lib/stored_values.js";
import type * as lib_text from "../lib/text.js";
import type * as lib_tracking from "../lib/tracking.js";
import type * as lib_value_coercion from "../lib/value_coercion.js";
import type * as lib_value_validation from "../lib/value_validation.js";
import type * as lib_widget_layout from "../lib/widget_layout.js";
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
import type * as sst_library_forms_capacitaciones_y_charlas from "../sst_library/forms/capacitaciones_y_charlas.js";
import type * as sst_library_forms_control_de_ausentismo from "../sst_library/forms/control_de_ausentismo.js";
import type * as sst_library_forms_gestion_ambiental from "../sst_library/forms/gestion_ambiental.js";
import type * as sst_library_forms_horas_hombre_trabajadas from "../sst_library/forms/horas_hombre_trabajadas.js";
import type * as sst_library_forms_registro_fotografico from "../sst_library/forms/registro_fotografico.js";
import type * as sst_library_forms_seguimiento_de_hallazgos from "../sst_library/forms/seguimiento_de_hallazgos.js";
import type * as sst_library_forms_sst_f_007 from "../sst_library/forms/sst_f_007.js";
import type * as sst_library_forms_sst_f_010 from "../sst_library/forms/sst_f_010.js";
import type * as sst_library_forms_sst_f_031 from "../sst_library/forms/sst_f_031.js";
import type * as sst_library_forms_sst_f_038 from "../sst_library/forms/sst_f_038.js";
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
import type * as sst_library_results from "../sst_library/results.js";
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
  dashboards: typeof dashboards;
  demoData: typeof demoData;
  formCategories: typeof formCategories;
  formDigests: typeof formDigests;
  formEntries: typeof formEntries;
  formFiles: typeof formFiles;
  formImports: typeof formImports;
  formLibrary: typeof formLibrary;
  formResponses: typeof formResponses;
  formResults: typeof formResults;
  formTrackings: typeof formTrackings;
  formVersions: typeof formVersions;
  forms: typeof forms;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/checklist_summary": typeof lib_checklist_summary;
  "lib/date_buckets": typeof lib_date_buckets;
  "lib/dates": typeof lib_dates;
  "lib/digest_validators": typeof lib_digest_validators;
  "lib/entry_title": typeof lib_entry_title;
  "lib/error_messages": typeof lib_error_messages;
  "lib/field_computed": typeof lib_field_computed;
  "lib/field_config_validation": typeof lib_field_config_validation;
  "lib/field_logic": typeof lib_field_logic;
  "lib/field_text": typeof lib_field_text;
  "lib/form_access": typeof lib_form_access;
  "lib/form_context": typeof lib_form_context;
  "lib/form_details": typeof lib_form_details;
  "lib/form_digests": typeof lib_form_digests;
  "lib/form_evaluation": typeof lib_form_evaluation;
  "lib/form_references": typeof lib_form_references;
  "lib/form_rows": typeof lib_form_rows;
  "lib/form_store": typeof lib_form_store;
  "lib/form_types": typeof lib_form_types;
  "lib/form_validation": typeof lib_form_validation;
  "lib/form_validators": typeof lib_form_validators;
  "lib/form_values": typeof lib_form_values;
  "lib/import_types": typeof lib_import_types;
  "lib/join_codes": typeof lib_join_codes;
  "lib/password_policy": typeof lib_password_policy;
  "lib/response_digest": typeof lib_response_digest;
  "lib/result_compute": typeof lib_result_compute;
  "lib/result_coverage": typeof lib_result_coverage;
  "lib/result_definition": typeof lib_result_definition;
  "lib/result_tracking": typeof lib_result_tracking;
  "lib/result_types": typeof lib_result_types;
  "lib/result_validators": typeof lib_result_validators;
  "lib/stored_values": typeof lib_stored_values;
  "lib/text": typeof lib_text;
  "lib/tracking": typeof lib_tracking;
  "lib/value_coercion": typeof lib_value_coercion;
  "lib/value_validation": typeof lib_value_validation;
  "lib/widget_layout": typeof lib_widget_layout;
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
  "sst_library/forms/capacitaciones_y_charlas": typeof sst_library_forms_capacitaciones_y_charlas;
  "sst_library/forms/control_de_ausentismo": typeof sst_library_forms_control_de_ausentismo;
  "sst_library/forms/gestion_ambiental": typeof sst_library_forms_gestion_ambiental;
  "sst_library/forms/horas_hombre_trabajadas": typeof sst_library_forms_horas_hombre_trabajadas;
  "sst_library/forms/registro_fotografico": typeof sst_library_forms_registro_fotografico;
  "sst_library/forms/seguimiento_de_hallazgos": typeof sst_library_forms_seguimiento_de_hallazgos;
  "sst_library/forms/sst_f_007": typeof sst_library_forms_sst_f_007;
  "sst_library/forms/sst_f_010": typeof sst_library_forms_sst_f_010;
  "sst_library/forms/sst_f_031": typeof sst_library_forms_sst_f_031;
  "sst_library/forms/sst_f_038": typeof sst_library_forms_sst_f_038;
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
  "sst_library/results": typeof sst_library_results;
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
