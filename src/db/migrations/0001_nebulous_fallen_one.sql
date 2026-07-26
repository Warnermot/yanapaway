CREATE TABLE "sedes_institucion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institucion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text,
	"latitud" double precision,
	"longitud" double precision,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sedes_institucion" ADD CONSTRAINT "sedes_institucion_institucion_id_instituciones_id_fk" FOREIGN KEY ("institucion_id") REFERENCES "public"."instituciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sedes_institucion_id" ON "sedes_institucion" USING btree ("institucion_id");--> statement-breakpoint
CREATE INDEX "idx_sedes_ubicacion" ON "sedes_institucion" USING btree ("latitud","longitud");