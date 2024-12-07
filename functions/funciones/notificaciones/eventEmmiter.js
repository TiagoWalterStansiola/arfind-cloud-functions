const admin = require('firebase-admin');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
// Escuchar el evento "pedidoCreado" para enviar notificaciones
eventEmitter.on('pedidoCreado', async (data) => {
    const { id_usuario, id_dispositivo, tipo, parametros } = data;

    try {
        // Validar datos requeridos
        if (!id_usuario || !tipo || !parametros) {
            console.error('Datos incompletos para procesar la notificación.');
            return;
        }

        // Obtener el tipo de notificación desde Firestore
        const tipoNotificacionSnapshot = await admin.firestore()
            .collection('tipos_notificaciones')
            .where('tipo', '==', tipo)
            .limit(1)
            .get();

        if (tipoNotificacionSnapshot.empty) {
            console.error(`Tipo de notificación "${tipo}" no encontrado.`);
            return;
        }

        const tipoNotificacion = tipoNotificacionSnapshot.docs[0].data();

        // Personalizar el mensaje con los parámetros
        let mensaje = tipoNotificacion.mensaje_plantilla;
        Object.keys(parametros).forEach((key) => {
            mensaje = mensaje.replace(`{{${key}}}`, parametros[key]);
        });

        // Crear la notificación en Firestore
        const nuevaNotificacion = {
            mensaje,
            id_usuario,
            id_dispositivo: id_dispositivo || null, // Puede ser opcional
            tipo_notificacion_id: tipoNotificacionSnapshot.docs[0].id,
            fecha_envio: admin.firestore.FieldValue.serverTimestamp(),
        };

        await admin.firestore().collection('notificaciones').add(nuevaNotificacion);
        console.log('Notificación creada con éxito:', nuevaNotificacion);
    } catch (error) {
        console.error('Error al procesar la notificación:', error);
    }
});
module.exports = eventEmitter;
