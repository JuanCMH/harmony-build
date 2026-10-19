/** Los elementos de ejemplo de los listados, para poder probar los formatos
 *  que los relacionan. Sólo se instalan si se piden.
 *
 *  Son **ficticios**: nombres inventados, cédulas `1000000001`, placas
 *  `ABC-123`. Ninguno sale de las hojas de los formatos originales.
 *
 *  Cada valor es el que guardaría su campo: el `value` de la opción en una
 *  lista, `YYYY-MM-DD` en una fecha. En un campo de **relación** el ejemplo
 *  lleva el **título** del elemento relacionado («Planta Norte»), que es otro
 *  ejemplo del listado de destino: quien instala lo cambia por su id.
 */

import type { LibraryEntry } from "./types";

const workCenters: LibraryEntry[] = [
  {
    nombre: "Planta Norte",
    ciudad: "Bogotá",
    responsable: "Laura Pérez Gómez",
  },
  {
    nombre: "Obra Bodega El Prado",
    ciudad: "Medellín",
    responsable: "Andrés Molina Ruiz",
  },
  {
    nombre: "Taller de mantenimiento",
    ciudad: "Bogotá",
    responsable: "Diana Castro León",
  },
];

const staff: LibraryEntry[] = [
  {
    nombre: "Carlos Andrés Medina Peña",
    cedula: "1000000001",
    cargo: "Conductor",
    celular: "3000000001",
    "contacto-emergencia": "María Peña",
    "celular-emergencia": "3000000011",
    rh: "o-positivo",
    eps: "Nueva EPS",
    arl: "ARL Sura",
    afp: "Porvenir",
    alergias: "Ninguna",
    "licencia-numero": "1000000001",
    "licencia-categoria": "c2",
    "licencia-vigencia": "2028-06-30",
  },
  {
    nombre: "Luisa Fernanda Gómez Ardila",
    cedula: "1000000002",
    cargo: "Coordinadora SST",
    celular: "3000000002",
    "contacto-emergencia": "Jorge Gómez",
    "celular-emergencia": "3000000012",
    rh: "a-positivo",
    eps: "Sanitas",
    arl: "ARL Sura",
    afp: "Protección",
    alergias: "Penicilina",
  },
  {
    nombre: "Jhon Fredy Martínez Salazar",
    cedula: "1000000003",
    cargo: "Operador de planta",
    celular: "3000000003",
    "contacto-emergencia": "Sandra Salazar",
    "celular-emergencia": "3000000013",
    rh: "o-negativo",
    eps: "Compensar",
    arl: "Positiva",
    afp: "Colpensiones",
    alergias: "Ninguna",
  },
  {
    nombre: "Yuliana Torres Cárdenas",
    cedula: "1000000004",
    cargo: "Conductora",
    celular: "3000000004",
    "contacto-emergencia": "Pedro Torres",
    "celular-emergencia": "3000000014",
    rh: "b-positivo",
    eps: "Sura",
    arl: "Colmena",
    afp: "Porvenir",
    alergias: "Ninguna",
    "licencia-numero": "1000000004",
    "licencia-categoria": "c3",
    "licencia-vigencia": "2027-11-15",
  },
];

const vehicles: LibraryEntry[] = [
  {
    placa: "ABC-123",
    "tipo-vehiculo": "mezcladora",
    propietario: "Constructora Ejemplo S.A.S.",
    "soat-numero": "1000000000001",
    "soat-vigencia": "2027-03-15",
    "seguro-terceros": true,
    "rtm-numero": "100000001",
    "rtm-vigencia": "2027-02-28",
    "tarjeta-propiedad": "10000000001",
  },
  {
    placa: "DEF-456",
    "tipo-vehiculo": "volqueta",
    propietario: "Constructora Ejemplo S.A.S.",
    "soat-numero": "1000000000002",
    "soat-vigencia": "2027-08-01",
    "seguro-terceros": true,
    "rtm-numero": "100000002",
    "rtm-vigencia": "2027-07-20",
    "tarjeta-propiedad": "10000000002",
  },
  {
    placa: "GHI-789",
    "tipo-vehiculo": "camioneta",
    propietario: "Transportes Ficticios Ltda.",
    "soat-numero": "1000000000003",
    "soat-vigencia": "2026-12-10",
    "seguro-terceros": false,
    "rtm-numero": "100000003",
    "rtm-vigencia": "2026-12-05",
    "tarjeta-propiedad": "10000000003",
  },
];

const equipment: LibraryEntry[] = [
  {
    nombre: "Pulidora Bosch GWS 850",
    "tipo-equipo": "pulidora",
    marca: "Bosch",
    referencia: "GWS 850",
    "tipo-pulidora": "electrica",
  },
  {
    nombre: "Soldador Lincoln AC-225",
    "tipo-equipo": "soldador-electrico",
    marca: "Lincoln Electric",
    referencia: "AC-225",
  },
  {
    nombre: "Compresor Schulz CSL 10",
    "tipo-equipo": "compresor",
    marca: "Schulz",
    referencia: "CSL 10",
  },
  {
    nombre: "Cargador Caterpillar 924K",
    "tipo-equipo": "cargador",
    marca: "Caterpillar",
    referencia: "924K",
  },
  {
    nombre: "Planta dosificadora Odisa 6000",
    "tipo-equipo": "planta-de-concreto",
    marca: "Odisa",
    referencia: "6000",
  },
];

const extinguishers: LibraryEntry[] = [
  {
    numero: "EXT-001",
    "tipo-extintor": "polvo-quimico-seco",
    capacidad: "20-lb",
    "proxima-recarga": "2027-04-30",
    "centro-trabajo": "Planta Norte",
    ubicacion: "Cabina de control",
  },
  {
    numero: "EXT-002",
    "tipo-extintor": "co2",
    capacidad: "10-lb",
    "proxima-recarga": "2027-04-30",
    "centro-trabajo": "Planta Norte",
    ubicacion: "Cuarto eléctrico",
  },
  {
    numero: "EXT-003",
    "tipo-extintor": "polvo-quimico-seco",
    capacidad: "30-lb",
    "proxima-recarga": "2027-01-15",
    "centro-trabajo": "Taller de mantenimiento",
    ubicacion: "Zona de soldadura",
  },
];

export const SAMPLE_ENTRIES = {
  workCenters,
  staff,
  vehicles,
  equipment,
  extinguishers,
};
