CREATE TYPE "public"."tipo_institucion" AS ENUM('defensoria', 'felcv', 'fiscalia', 'policia', 'slim', 'linea_emergencia', 'otro');--> statement-breakpoint
CREATE TABLE "instituciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_institucion" NOT NULL,
	"descripcion" text,
	"direccion" text,
	"telefono" text,
	"whatsapp" text,
	"correo" text,
	"sitio_web" text,
	"horario" jsonb,
	"latitud" double precision,
	"longitud" double precision,
	"es_emergencia" boolean DEFAULT false NOT NULL,
	"esta_activo" boolean DEFAULT true NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instituciones_tipos_caso" (
	"institucion_id" uuid NOT NULL,
	"tipo_caso_id" uuid NOT NULL,
	CONSTRAINT "instituciones_tipos_caso_institucion_id_tipo_caso_id_pk" PRIMARY KEY("institucion_id","tipo_caso_id")
);
--> statement-breakpoint
CREATE TABLE "solicitudes_orientacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institucion_id" uuid,
	"tipo_caso_id" uuid,
	"mensaje" text NOT NULL,
	"info_contacto" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_caso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "tipos_caso_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
ALTER TABLE "instituciones_tipos_caso" ADD CONSTRAINT "instituciones_tipos_caso_institucion_id_instituciones_id_fk" FOREIGN KEY ("institucion_id") REFERENCES "public"."instituciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instituciones_tipos_caso" ADD CONSTRAINT "instituciones_tipos_caso_tipo_caso_id_tipos_caso_id_fk" FOREIGN KEY ("tipo_caso_id") REFERENCES "public"."tipos_caso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_orientacion" ADD CONSTRAINT "solicitudes_orientacion_institucion_id_instituciones_id_fk" FOREIGN KEY ("institucion_id") REFERENCES "public"."instituciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_orientacion" ADD CONSTRAINT "solicitudes_orientacion_tipo_caso_id_tipos_caso_id_fk" FOREIGN KEY ("tipo_caso_id") REFERENCES "public"."tipos_caso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_instituciones_ubicacion" ON "instituciones" USING btree ("latitud","longitud");--> statement-breakpoint
CREATE INDEX "idx_instituciones_tipo" ON "instituciones" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_instituciones_emergencia" ON "instituciones" USING btree ("es_emergencia") WHERE "instituciones"."es_emergencia" = true;