import { db } from '../client';
import { solicitudesOrientacion } from '../schema';

export type DatosSolicitudOrientacion = {
  institucionId?: string;
  tipoCasoId?: string;
  mensaje: string;
  infoContacto?: string;
};

export async function crearSolicitudOrientacion(datos: DatosSolicitudOrientacion) {
  const [solicitud] = await db
    .insert(solicitudesOrientacion)
    .values({
      institucionId: datos.institucionId,
      tipoCasoId: datos.tipoCasoId,
      mensaje: datos.mensaje,
      infoContacto: datos.infoContacto,
    })
    .returning({ id: solicitudesOrientacion.id, estado: solicitudesOrientacion.estado });

  return solicitud;
}
