import { strapiPost } from './strapi';

export type DatosSolicitudOrientacion = {
  institucionId?: string;
  tipoCasoId?: string;
  mensaje: string;
  infoContacto?: string;
};

type SolicitudCreada = { documentId: string; estado: string };

export async function crearSolicitudOrientacion(datos: DatosSolicitudOrientacion) {
  const respuesta = await strapiPost<{ data: SolicitudCreada }>('/api/solicitudes-orientacion', {
    mensaje: datos.mensaje,
    contacto: datos.infoContacto,
    institucion: datos.institucionId,
    tipoCaso: datos.tipoCasoId,
    estado: 'pendiente',
  });

  return { id: respuesta.data.documentId, estado: respuesta.data.estado };
}
