/** Los cinco listados de la biblioteca: lo que la obra **tiene**, y que los
 *  formatos eligen en vez de copiarlo a mano.
 *
 *  Van en un orden en que ninguno relaciona a uno posterior: los extintores
 *  apuntan a los centros de trabajo, que van primero.
 *
 *  Sus elementos de ejemplo están en `catalog_samples.ts`.
 */

import {
  checkbox,
  choice,
  choices,
  date,
  onlyWhen,
  phone,
  reference,
  section,
  sections,
  select,
  text,
} from "./builders";
import { SAMPLE_ENTRIES } from "./catalog_samples";
import { CATALOG, CATEGORY, capacityOptions } from "./common";
import type { LibraryForm } from "./types";

const workCenters: LibraryForm = {
  key: CATALOG.workCenters,
  kind: "catalog",
  name: "Centros de trabajo",
  category: CATEGORY.catalogs,
  description:
    "Las obras, plantas y sedes del proyecto. Es lo que los formatos en papel llamaban proyecto, obra, centro de trabajo u obra o área.",
  titleFieldId: "nombre",
  sections: sections(
    section("centro", "Centro de trabajo", [
      text("Nombre", {
        required: true,
        showInTable: true,
        placeholder: "ej: Planta Norte",
      }),
      text("Ciudad", { showInTable: true, placeholder: "ej: Bogotá" }),
      text("Responsable", {
        showInTable: true,
        description: "Quien responde por el centro de trabajo",
        placeholder: "ej: Laura Pérez Gómez",
      }),
    ]),
  ),
  sampleEntries: SAMPLE_ENTRIES.workCenters,
};

const staff: LibraryForm = {
  key: CATALOG.staff,
  kind: "catalog",
  name: "Personal",
  category: CATEGORY.catalogs,
  description:
    "Las personas de la obra, con sus datos de contacto, de salud y de seguridad social, y la licencia de quien conduce.",
  titleFieldId: "nombre",
  sections: sections(
    section("datos", "Datos personales", [
      text("Nombres y apellidos", {
        id: "nombre",
        required: true,
        showInTable: true,
        placeholder: "ej: Carlos Andrés Medina Peña",
      }),
      text("Cédula", {
        size: "small",
        showInTable: true,
        placeholder: "ej: 1000000001",
      }),
      text("Cargo", {
        size: "small",
        showInTable: true,
        placeholder: "ej: Conductor",
      }),
      phone("Celular", { showInTable: true, placeholder: "ej: 3000000001" }),
      text("Contacto de emergencia", {
        id: "contacto-emergencia",
        description: "A quién llamar en caso de emergencia",
        placeholder: "ej: María Peña (madre)",
      }),
      phone("Celular del contacto", {
        id: "celular-emergencia",
        placeholder: "ej: 3000000002",
      }),
    ]),
    section("salud", "Salud y seguridad social", [
      select(
        "RH",
        [
          choice("O+", "o-positivo"),
          choice("O-", "o-negativo"),
          choice("A+", "a-positivo"),
          choice("A-", "a-negativo"),
          choice("B+", "b-positivo"),
          choice("B-", "b-negativo"),
          choice("AB+", "ab-positivo"),
          choice("AB-", "ab-negativo"),
        ],
        { size: "small" },
      ),
      text("EPS", { size: "small", placeholder: "ej: Nueva EPS" }),
      text("ARL", { size: "small", placeholder: "ej: ARL Sura" }),
      text("AFP", { size: "small", placeholder: "ej: Porvenir" }),
      text("Alergias", {
        placeholder: "ej: Penicilina",
        description: "Si no tiene, escribe «Ninguna»",
      }),
    ]),
    section(
      "licencia",
      "Licencia de conducción",
      [
        text("Licencia de conducción n.º", {
          id: "licencia-numero",
          placeholder: "ej: 1000000001",
        }),
        select(
          "Categoría",
          choices(["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"]),
          { id: "licencia-categoria", size: "small" },
        ),
        date("Vigencia de la licencia", { id: "licencia-vigencia" }),
      ],
      "Sólo para quien conduce.",
    ),
  ),
  sampleEntries: SAMPLE_ENTRIES.staff,
};

const vehicles: LibraryForm = {
  key: CATALOG.vehicles,
  kind: "catalog",
  name: "Vehículos",
  category: CATEGORY.catalogs,
  description:
    "Los vehículos de la obra con su información legal: SOAT, revisión técnico-mecánica y tarjeta de propiedad.",
  titleFieldId: "placa",
  sections: sections(
    section("vehiculo", "Vehículo", [
      text("Placa", {
        size: "small",
        required: true,
        showInTable: true,
        placeholder: "ej: ABC-123",
      }),
      select(
        "Tipo de vehículo",
        choices([
          "Camioneta",
          "Automóvil",
          "Furgón",
          "Camión",
          "Volqueta",
          "Mezcladora",
          "Tractocamión",
          "Tráiler",
          "Otro",
        ]),
        { id: "tipo-vehiculo", size: "small", showInTable: true },
      ),
      text("Propietario", {
        showInTable: true,
        placeholder: "ej: Constructora Ejemplo S.A.S.",
      }),
    ]),
    section("documentos", "Documentos", [
      text("SOAT n.º", {
        id: "soat-numero",
        description: "Número de la póliza del seguro obligatorio",
        placeholder: "ej: 1000000000001",
      }),
      date("Vigencia del SOAT", { id: "soat-vigencia", showInTable: true }),
      checkbox("Seguro contra terceros", {
        id: "seguro-terceros",
        description: "Márcalo si el vehículo tiene la póliza",
      }),
      text("Revisión técnico-mecánica n.º", {
        id: "rtm-numero",
        description:
          "Número del certificado de revisión técnico-mecánica y de gases",
        placeholder: "ej: 100000001",
      }),
      date("Vigencia de la revisión", {
        id: "rtm-vigencia",
        showInTable: true,
      }),
      text("Tarjeta de propiedad n.º", {
        id: "tarjeta-propiedad",
        size: "small",
        placeholder: "ej: 10000000001",
      }),
    ]),
  ),
  sampleEntries: SAMPLE_ENTRIES.vehicles,
};

const equipmentCatalog: LibraryForm = {
  key: CATALOG.equipment,
  kind: "catalog",
  name: "Equipos y maquinaria",
  category: CATEGORY.catalogs,
  description:
    "Los equipos y la maquinaria que se inspeccionan antes de operar, con su marca y su referencia.",
  titleFieldId: "nombre",
  sections: sections(
    section("equipo", "Equipo", [
      text("Nombre del equipo", {
        id: "nombre",
        required: true,
        showInTable: true,
        description: "Como se le conoce en la obra",
        placeholder: "ej: Pulidora Bosch GWS 850",
      }),
      select(
        "Tipo de equipo",
        choices([
          "Soldador eléctrico",
          "Pulidora",
          "Cargador",
          "Compresor",
          "Prensa hidráulica",
          "Herramienta neumática",
          "Planta de concreto",
          "Otro",
        ]),
        { id: "tipo-equipo", showInTable: true },
      ),
      text("Marca", { showInTable: true, placeholder: "ej: Bosch" }),
      text("Referencia", { showInTable: true, placeholder: "ej: GWS 850" }),
      select("Tipo de pulidora", choices(["Inalámbrica", "Eléctrica"]), {
        id: "tipo-pulidora",
        visibility: onlyWhen("tipo-equipo", "pulidora"),
      }),
    ]),
  ),
  sampleEntries: SAMPLE_ENTRIES.equipment,
};

const extinguishers: LibraryForm = {
  key: CATALOG.extinguishers,
  kind: "catalog",
  name: "Extintores",
  category: CATEGORY.catalogs,
  description:
    "El inventario de extintores: cada uno se inspecciona por separado y conserva su historial.",
  titleFieldId: "numero",
  sections: sections(
    section("extintor", "Extintor", [
      text("Número", {
        size: "small",
        required: true,
        showInTable: true,
        description: "El que lleva marcado el extintor",
        placeholder: "ej: EXT-001",
      }),
      select(
        "Tipo",
        [
          choice("Polvo químico seco", "polvo-quimico-seco"),
          choice("CO₂", "co2"),
          choice("Agua a presión", "agua-presion"),
          choice("Agente limpio", "agente-limpio"),
          choice("Espuma", "espuma"),
          choice("Tipo K", "tipo-k"),
        ],
        { id: "tipo-extintor", size: "small", showInTable: true },
      ),
      select("Capacidad", capacityOptions(), {
        size: "small",
        showInTable: true,
      }),
      date("Próxima recarga", { id: "proxima-recarga", showInTable: true }),
      reference("Centro de trabajo", CATALOG.workCenters, [], {
        id: "centro-trabajo",
        showInTable: true,
        placeholder: "Busca por nombre",
      }),
      text("Ubicación", {
        description: "Área o sección donde está instalado",
        placeholder: "ej: Bodega, junto a la entrada",
      }),
    ]),
  ),
  sampleEntries: SAMPLE_ENTRIES.extinguishers,
};

/** Los listados, en orden de instalación. */
export const SST_CATALOGS: LibraryForm[] = [
  workCenters,
  staff,
  vehicles,
  equipmentCatalog,
  extinguishers,
];
