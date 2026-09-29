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
