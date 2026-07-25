import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const tipoInstitucionEnum = pgEnum('tipo_institucion', [
  'defensoria',
  'felcv',
  'fiscalia',
  'policia',
  'slim',
  'linea_emergencia',
  'otro',
]);

export const instituciones = pgTable(
  'instituciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: text('nombre').notNull(),
    tipo: tipoInstitucionEnum('tipo').notNull(),
    descripcion: text('descripcion'),
    direccion: text('direccion'),
    telefono: text('telefono'),
    whatsapp: text('whatsapp'),
    correo: text('correo'),
    sitioWeb: text('sitio_web'),
    horario: jsonb('horario'),
    latitud: doublePrecision('latitud'),
    longitud: doublePrecision('longitud'),
    esEmergencia: boolean('es_emergencia').notNull().default(false),
    estaActivo: boolean('esta_activo').notNull().default(true),
    // FK a usuarios.id: la tabla `usuarios` la crea y administra el módulo
    // CMS de Miguel, no este módulo. Se guarda el id sin `.references()`
    // hasta confirmar el nombre/columnas exactas (Fase 0, pendiente).
    creadoPor: uuid('creado_por'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_instituciones_ubicacion').on(table.latitud, table.longitud),
    index('idx_instituciones_tipo').on(table.tipo),
    index('idx_instituciones_emergencia')
      .on(table.esEmergencia)
      .where(sql`${table.esEmergencia} = true`),
  ],
);

export const tiposCaso = pgTable('tipos_caso', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull().unique(),
});

export const institucionesTiposCaso = pgTable(
  'instituciones_tipos_caso',
  {
    institucionId: uuid('institucion_id')
      .notNull()
      .references(() => instituciones.id, { onDelete: 'cascade' }),
    tipoCasoId: uuid('tipo_caso_id')
      .notNull()
      .references(() => tiposCaso.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.institucionId, table.tipoCasoId] })],
);

export const solicitudesOrientacion = pgTable('solicitudes_orientacion', {
  id: uuid('id').primaryKey().defaultRandom(),
  institucionId: uuid('institucion_id').references(() => instituciones.id),
  tipoCasoId: uuid('tipo_caso_id').references(() => tiposCaso.id),
  mensaje: text('mensaje').notNull(),
  infoContacto: text('info_contacto'),
  estado: text('estado').notNull().default('pendiente'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});
