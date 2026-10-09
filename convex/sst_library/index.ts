/** La biblioteca de formatos SST: los formatos de una empresa de
 *  construcción, que eran hojas de Excel, como definiciones de formato.
 *
 *  El orden es el de instalación: primero los listados —y entre ellos, antes
 *  el que otro relaciona—, después los formatos que los eligen.
 */

import { SST_CATALOGS } from "./catalogs";
import { SST_F_007 } from "./forms/sst_f_007";
import { SST_F_010 } from "./forms/sst_f_010";
import { SST_F_031 } from "./forms/sst_f_031";
import { SST_F_038 } from "./forms/sst_f_038";
import { HORAS_HOMBRE_TRABAJADAS } from "./forms/horas_hombre_trabajadas";
import { CONTROL_DE_AUSENTISMO } from "./forms/control_de_ausentismo";
import { CAPACITACIONES_Y_CHARLAS } from "./forms/capacitaciones_y_charlas";
import { GESTION_AMBIENTAL } from "./forms/gestion_ambiental";
import { REGISTRO_FOTOGRAFICO } from "./forms/registro_fotografico";
import { SST_F_065 } from "./forms/sst_f_065";
import { SST_F_066 } from "./forms/sst_f_066";
import { SST_F_074 } from "./forms/sst_f_074";
import { SST_F_075 } from "./forms/sst_f_075";
import { SST_F_080 } from "./forms/sst_f_080";
import { SST_F_083 } from "./forms/sst_f_083";
import { SST_F_090 } from "./forms/sst_f_090";
import { SST_F_115 } from "./forms/sst_f_115";
import { SST_F_116 } from "./forms/sst_f_116";
import { SST_F_118 } from "./forms/sst_f_118";
import type { LibraryForm } from "./types";

export const SST_LIBRARY: LibraryForm[] = [
  ...SST_CATALOGS,
  // Inspecciones preoperacionales
  SST_F_010,
  SST_F_031,
  SST_F_038,
  SST_F_080,
  SST_F_083,
  SST_F_090,
  SST_F_115,
  SST_F_116,
  // Inspecciones de emergencia
  SST_F_118,
  SST_F_075,
  SST_F_066,
  SST_F_065,
  SST_F_074,
  // Dotación
  SST_F_007,
  // Gestión SST: lo que en el papel eran las hojas del informe `SST-F-046`
  HORAS_HOMBRE_TRABAJADAS,
  CONTROL_DE_AUSENTISMO,
  CAPACITACIONES_Y_CHARLAS,
  GESTION_AMBIENTAL,
  REGISTRO_FOTOGRAFICO,
];
