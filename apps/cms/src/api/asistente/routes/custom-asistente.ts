export default {
  routes: [
    {
      method: 'POST',
      path: '/asistente/chat',
      handler: 'asistente.enviarMensaje',
      config: {
        auth: false, // Ajustar cuando la autenticación de usuarios esté lista
        description: 'Recibe el mensaje del usuario, llama a la IA y devuelve la respuesta.',
      },
    },
  ],
};
