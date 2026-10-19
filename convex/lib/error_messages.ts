import {
  FORM_CODE_MAX,
  FORM_DESCRIPTION_MAX,
  FORM_LIMITS,
  FORM_NAME_MAX,
  FORM_NAME_MIN,
  MAX_FILE_SIZE_MB,
  VOID_REASON_MAX,
  VOID_REASON_MIN,
} from "./form_types";
import { IMPORT_LIMITS } from "./import_types";

export const authErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  weakPassword:
    "La contraseña debe tener al menos 8 caracteres y cumplir 3 de: mayúscula, minúscula, número y símbolo",
  verificationCodeSendFailed:
    "No se pudo enviar el código de verificación. Inténtalo de nuevo",
};

export const projectsErrors = {
  unauthorized: "No tienes permisos para realizar esta acción",
  projectNotFound: "Proyecto no encontrado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  userNotAuthenticated: "Usuario no autenticado",
  userNotFound: "Usuario no encontrado",
  joinError: "Código de unión incorrecto",
  cannotCreateNewCode: "No tienes permiso para crear un nuevo código",
  cannotEditProject: "No tienes permisos para editar este proyecto",
  cannotDeleteProject: "Sólo quien es propietario puede eliminar el proyecto",
  cannotTransferProject:
    "Sólo quien es propietario puede transferir el proyecto",
  newOwnerMustBeMember:
    "Sólo puedes transferir el proyecto a alguien que ya es miembro",
  alreadyOwner: "Esa persona ya es la propietaria del proyecto",
  invalidName: "El nombre del proyecto debe tener entre 4 y 40 caracteres",
  invalidCode: "El código del proyecto no puede tener más de 20 caracteres",
  defaultRoleNotFound: "El rol elegido no existe en este proyecto",
};

export const membersErrors = {
  unauthorized: "No tienes permisos para realizar esta acción",
  memberNotFound: "Miembro no encontrado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  userNotAuthenticated: "Usuario no autenticado",
  noProjectAccess: "No tienes acceso a este proyecto",
  cannotRemoveYourself: "No puedes eliminarte a ti mismo",
  cannotAssignAdminRole:
    "Sólo un administrador puede cambiar el rol de administrador de un miembro",
  cannotChangeOwner:
    "El propietario sólo cambia transfiriendo el proyecto desde los ajustes",
  userNotFound: "Usuario no encontrado",
};

export const rolesErrors = {
  unauthorized: "No tienes permisos para realizar esta acción",
  roleNotFound: "Rol no encontrado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  userNotAuthenticated: "Parece que no estás autenticado",
  noProjectAccess: "No tienes acceso a este proyecto",
  cannotEditRoles: "No tienes permiso para editar roles",
  cannotDeleteRoles: "No tienes permiso para eliminar roles",
  cannotCreateRoles: "No tienes permiso para crear roles",
  invalidName: "El nombre del rol debe tener entre 2 y 40 caracteres",
};

export const usersErrors = {
  unauthorized: "No tienes permisos para realizar esta acción",
  userNotFound: "Usuario no encontrado",
  invalidName: "El nombre debe tener entre 4 y 40 caracteres",
  userNotAuthenticated: "Usuario no autenticado",
};

export const logsErrors = {
  unauthorized: "No tienes permisos para realizar esta acción",
  logNotFound: "Registro no encontrado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  userNotAuthenticated: "Usuario no autenticado",
  userNotFound: "Usuario no encontrado",
  projectNotFound: "Proyecto no encontrado",
};

/* ─────────────────────────── Módulo de formatos ─────────────────────────── */

/** «el formato» o «el listado», según la clase. */
const kindNoun = (kind: "record" | "catalog" | "tracking") =>
  kind === "catalog"
    ? "el listado"
    : kind === "tracking"
      ? "el seguimiento"
      : "el formato";

export const formCategoriesErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  categoryNotFound: "Categoría no encontrada",
  invalidName: "El nombre de la categoría debe tener entre 2 y 40 caracteres",
  duplicateName: "Ya existe una categoría con ese nombre",
  inUse: (count: number) =>
    count === 1
      ? "No se puede eliminar: 1 formato usa esta categoría"
      : `No se puede eliminar: ${count} formatos usan esta categoría`,
};

export const formsErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  formNotFound: "Formato no encontrado",
  versionNotFound: "Versión no encontrada",
  invalidName: `El nombre del formato debe tener entre ${FORM_NAME_MIN} y ${FORM_NAME_MAX} caracteres`,
  invalidCode: `El código del formato no puede tener más de ${FORM_CODE_MAX} caracteres`,
  invalidDescription: `La descripción no puede tener más de ${FORM_DESCRIPTION_MAX} caracteres`,
  categoryNotFound: "La categoría elegida no existe en este proyecto",
  audienceRoleNotFound: "Un rol de la audiencia no existe en este proyecto",
  audienceWithoutRoles:
    "Elige al menos un rol, o deja que lo diligencien todos",
  tooManyForms: "El proyecto llegó al máximo de formatos que admite",
  notCatalog: "Sólo un listado o un seguimiento tienen campo de título",
  titleFieldRequired:
    "Elige el campo de título antes de publicar: es como se nombra cada elemento o cada asunto",
  emptyForm: "Un formato sin campos no se puede publicar",
  archived: "El formato está archivado: reactívalo antes de cambiarlo",
  alreadyArchived: "El formato ya está archivado",
  notArchived: "El formato no está archivado",
  nothingToDiscard:
    "Este formato todavía no tiene una versión publicada a la que volver",
  hasResponses:
    "No se puede eliminar un formato con respuestas: archívalo para retirarlo",
  usedBy: (names: string[]) =>
    names.length === 1
      ? `No se puede eliminar: lo usa el formato «${names[0]}»`
      : `No se puede eliminar: lo usan los formatos ${names
          .map((name) => `«${name}»`)
          .join(", ")}`,
  fieldInUse: (field: string, form: string) =>
    `No se puede quitar «${field}»: el formato «${form}» lo trae al elegir un elemento de este listado`,
  titleFieldInUse: (field: string) =>
    `No se puede quitar «${field}»: es el campo que titula cada elemento`,
  referenceNotFound: (field: string) =>
    `«${field}» apunta a un listado que no existe en este proyecto`,
  referenceNotCatalog: (field: string, form: string) =>
    `«${field}» apunta a «${form}», que no es un listado`,
  referenceNotPublished: (field: string, form: string) =>
    `«${field}» apunta al listado «${form}», que todavía no está publicado`,
  referenceFillMissing: (field: string, form: string) =>
    `«${field}» trae un campo que ya no existe en el listado «${form}»`,
  referenceCycle: (path: string[]) =>
    `Los listados se relacionan en círculo: ${path
      .map((name) => `«${name}»`)
      .join(" → ")}`,
};

export const formResultsErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  formNotFound: "Formato no encontrado",
  resultNotFound: "Resultado no encontrado",
  formNotPublished: "Publica el formato antes de definir sus resultados",
  tooManyResults: "Este formato ya tiene el máximo de resultados",
};

export const dashboardsErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  invalidTabs: "Un tablero lleva entre 1 y 20 pestañas, cada una con su nombre",
  invalidWidgets: "Una pestaña admite hasta 12 resultados",
  invalidHeight: "Uno de los resultados tiene un alto que su tipo no admite",
  duplicateId: "Hay dos pestañas o dos resultados con el mismo identificador",
  resultNotFound: "Uno de los resultados ya no existe en este proyecto",
};

export const formResponsesErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  formNotFound: "Formato no encontrado",
  responseNotFound: "Respuesta no encontrada",
  entryNotFound: "Elemento no encontrado",
  formNotFillable: (kind: "record" | "catalog" | "tracking") =>
    `No se puede diligenciar: ${kindNoun(kind)} no está publicado o está archivado`,
  notRecord: "Un listado no se diligencia: sus elementos se añaden desde él",
  notCatalog: "Sólo un listado tiene elementos",
  missingRequiredFields: "Faltan campos obligatorios por rellenar",
  fileInvalid: "El archivo no es válido: vuelve a adjuntarlo",
  fileTooLarge: "El archivo pesa más de lo que admite el campo",
  fileWrongType: "Ese tipo de archivo no se admite en este campo",
  signatureInvalid: "La firma no es válida: vuelve a firmar",
  referenceInvalid: (field: string) =>
    `«${field}»: el elemento elegido ya no está disponible. Elige otro`,
  invalidVoidReason: `El motivo debe tener entre ${VOID_REASON_MIN} y ${VOID_REASON_MAX} caracteres`,
  alreadyVoided: "La respuesta ya está anulada",
  cannotVoidEntry: "Un elemento de un listado no se anula: se inactiva",
  fieldNotReference: "El campo no es una relación con un listado",
};

/**
 * Lo que puede estar mal en la **definición** de un formato. La llave es el
 * código estable que devuelve `validateForm`; el valor, lo que lee quien lo
 * construye.
 */
/** «5.000». A mano: el runtime de Convex no garantiza los datos de `es-CO`. */
const thousands = (value: number) =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formImportsErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  formNotFound: "Formato no encontrado",
  importNotFound: "Importación no encontrada",
  formNotPublished:
    "Sólo se importa en un formato publicado: publícalo o reactívalo antes",
  invalidMode: "Esa forma de importar no corresponde a esta clase de formato",
  invalidFileName: `El nombre del archivo debe tener entre 1 y ${IMPORT_LIMITS.maxFileNameLength} caracteres`,
  invalidTotal: `Un archivo puede traer entre 1 y ${thousands(IMPORT_LIMITS.maxRows)} filas: pártelo en varios`,
  batchTooLarge: `Un lote no puede traer más de ${IMPORT_LIMITS.batchSize} filas`,
  overTotal: "Llegaron más filas de las que se anunciaron al empezar",
  notRunning: "La importación ya terminó o se deshizo",
  notOwnImport: "Sólo quien empezó la importación puede continuarla",
  alreadyReverted: "La importación ya se deshizo",
  notCatalog: "Sólo un listado tiene elementos",
  // Los motivos por los que una fila se queda fuera.
  rowDateMissing: "Falta la fecha, o no es una fecha que exista",
  rowDateInFuture: "La fecha es posterior a hoy",
  rowEmpty: "La fila no trae ningún dato",
  rowTitleMissing: "Falta el dato que titula el elemento",
};

export const formTrackingsErrors = {
  userNotAuthenticated: "Usuario no autenticado",
  insufficientPermissions: "No tienes los permisos necesarios para esta acción",
  formNotFound: "Formato no encontrado",
  trackingNotFound: "Asunto no encontrado",
  notTracking: "Sólo un formato de seguimiento tiene asuntos",
  notOpen: "El asunto ya está cerrado o anulado",
  fieldNotDate: "La fecha de compromiso tiene que ser un campo de fecha",
  fieldNotReference:
    "El responsable tiene que ser una relación con un listado o un texto corto",
  invalidPrefix: "El prefijo del consecutivo cabe en 8 letras o números",
};

export const formProblems = {
  tooManySections: `Un formato admite como máximo ${FORM_LIMITS.maxSections} secciones`,
  tooManyFields: `Un formato admite como máximo ${FORM_LIMITS.maxFields} campos`,
  labelRequired: "Hay un nombre sin escribir",
  labelTooLong: `Un nombre no puede tener más de ${FORM_LIMITS.maxLabelLength} caracteres`,
  typeNotAllowed: "Ese tipo de campo no se puede usar en un listado",
  sizeNotFull:
    "Un texto largo, una lista de chequeo y una tabla ocupan la fila entera",
  reservedFieldId:
    "El identificador de un campo no puede empezar por @: está reservado a los datos de la respuesta",
  duplicateSectionId: "Hay dos secciones con el mismo identificador",
  duplicateFieldId: "Hay dos campos con el mismo identificador en el formato",
  duplicateBlockId: "Hay dos bloques con el mismo identificador en el formato",
  duplicateItemId: "Hay dos ítems con el mismo identificador en el formato",
  duplicateColumnId:
    "Hay dos columnas con el mismo identificador en el formato",
  duplicateOption: "Una lista tiene dos opciones con el mismo valor",
  optionsRequired: "Una lista necesita al menos una opción",
  tooManyOptions: `Una lista admite como máximo ${FORM_LIMITS.maxOptions} opciones`,
  rangeInvalid:
    "Un mínimo no puede ser mayor que su máximo, ni una longitud negativa",
  fileSizeRange: `El tamaño máximo de un archivo va de 1 a ${MAX_FILE_SIZE_MB} MB`,
  configRequired: "A un campo le falta la configuración propia de su tipo",
  configNotAllowed:
    "Un campo trae la configuración de otro tipo: no le corresponde",
  ruleWithoutField: "Una condición quedó sin elegir el campo del que depende",
  ruleWithoutValue: "Una condición quedó sin el valor con el que comparar",
  unknownReference: "Una regla apunta a un campo que no existe en el formato",
  ruleOptionMissing:
    "Una regla compara con una opción que ya no existe en su lista",
  controllerNotAllowed:
    "Una lista de chequeo no puede condicionar a otros campos",
  operatorNotAllowed:
    "Una condición usa una comparación que el campo del que depende no admite",
  sectionRuleNotEarlier:
    "Una sección sólo se puede condicionar a campos de secciones anteriores",
  dependencyCycle:
    "Las reglas se referencian en círculo: un campo no puede depender de sí mismo, ni directa ni indirectamente",
  todayDerivedReferenced:
    "Un campo que cuenta días o años desde hoy no puede usarse en otra regla ni en otra receta: su valor cambia cada día y no se guarda",
  computedTypeMismatch: "Esa receta no se puede usar en un campo de este tipo",
  computedOperandType:
    "Una receta usa un campo que no le sirve: revisa el tipo de sus operandos",
  computedIncomplete:
    "Una receta quedó a medias: le faltan operandos o su valor",
  computedRounding:
    "Los decimales van de 0 a 2, y un importe en pesos no lleva decimales",
  computedIsRequired:
    "Un campo calculado no lo rellena nadie, así que no puede ser obligatorio",
  autoValueTypeMismatch:
    "El valor sugerido sólo cabe en una lista, una casilla, un texto o una fecha",
  autoValueWithoutValue:
    "Una regla de valor sugerido quedó sin el valor que asigna",
  autoValueControllerType:
    "Un valor sugerido no puede depender de una relación, una firma, una tabla ni una lista de chequeo",
  checklistOptionsCount: `La escala de una lista de chequeo tiene de ${FORM_LIMITS.minChecklistOptions} a ${FORM_LIMITS.maxChecklistOptions} opciones`,
  checklistShort: `La abreviatura de una opción de la escala tiene de 1 a ${FORM_LIMITS.maxChecklistShort} caracteres`,
  checklistNoItems:
    "Una lista de chequeo necesita al menos un ítem que se responda",
  checklistTooManyItems: `Una lista de chequeo admite como máximo ${FORM_LIMITS.maxChecklistItems} ítems`,
  checklistIndentedOrphan:
    "Un subítem sólo puede ir debajo de un ítem que agrupa o de otro subítem",
  checklistNoteNeedsFail:
    "Para exigir la observación en lo no conforme, la escala necesita una opción «no conforme»",
  tableColumnsCount: `Una tabla tiene de 1 a ${FORM_LIMITS.maxTableColumns} columnas`,
  tableColumnOptions: "Una columna de lista necesita sus opciones",
  tableColumnReference: "Una columna de relación necesita su listado",
  tableColumnConfigNotAllowed:
    "Una columna trae la configuración de otro tipo: no le corresponde",
  tableRowsRange: `Las filas mínimas no pueden superar a las máximas, y una tabla admite hasta ${FORM_LIMITS.maxTableRows}`,
  referenceFormRequired: "Una relación quedó sin elegir su listado",
  referenceFillInvalid: `Una relación trae como máximo ${FORM_LIMITS.maxReferenceFill} campos del listado, sin repetir`,
  titleFieldMissing: "El campo de título ya no existe",
  titleFieldNotFirstStage:
    "El campo de título tiene que estar en la primera etapa: es con lo que se abre el asunto",
  stageConditional:
    "Una etapa de un seguimiento no puede llevar condición: tiene que poder completarse",
  stageEmpty: "Cada etapa de un seguimiento necesita al menos un campo",
  titleFieldInvalid:
    "El campo de título tiene que ser un texto corto, obligatorio, sin condición y sin receta",
} as const;

export type FormProblemCode = keyof typeof formProblems;

/**
 * Lo que puede estar mal en el **valor** de un campo. La llave es el código
 * estable que devuelve `validateValues`.
 */
export const valueProblems = {
  wrongKind: "El valor no es del tipo que el campo espera",
  invalidEmail: "No es un correo válido",
  invalidUrl: "No es un enlace válido: debe empezar por http:// o https://",
  invalidPhone: "No es un teléfono válido",
  invalidDate: "No es una fecha válida",
  invalidTime: "No es una hora válida",
  tooShort: "Es más corto de lo que admite el campo",
  tooLong: "Es más largo de lo que admite el campo",
  belowMin: "Es menor que el mínimo que admite el campo",
  aboveMax: "Es mayor que el máximo que admite el campo",
  optionMissing: "La opción elegida no existe en la lista",
  checklistUnknownItem: "Hay una respuesta a un ítem que no existe en la lista",
  checklistDuplicateItem: "Hay un ítem respondido dos veces",
  checklistOptionMissing: "Hay un ítem con una opción que no es de la escala",
  checklistIncomplete: "Faltan ítems por responder",
  checklistNoteRequired: "Falta la observación de un ítem no conforme",
  checklistNoteTooLong: `Una observación no puede tener más de ${FORM_LIMITS.maxNoteLength} caracteres`,
  checklistExtraNotAllowed:
    "Hay un ítem con una observación, una cantidad o una fecha que la lista no pide",
  checklistInvalidQuantity: "Hay un ítem con una cantidad que no es válida",
  checklistInvalidDate: "Hay un ítem con una fecha que no es válida",
  tableTooFewRows: "Faltan filas: la tabla pide más",
  tableTooManyRows: "Sobran filas: la tabla admite menos",
  tableDuplicateRow: "Hay dos filas con el mismo identificador",
  tableUnknownColumn: "Hay una celda de una columna que no existe en la tabla",
  tableCellRequired: "Hay una fila con una celda obligatoria sin llenar",
  tableCellInvalid: "Hay una celda con un valor que su columna no admite",
  signerNameRequired: "Falta el nombre de quien firma",
} as const;

export type ValueProblemCode = keyof typeof valueProblems;
