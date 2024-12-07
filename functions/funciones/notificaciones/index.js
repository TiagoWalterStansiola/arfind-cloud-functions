const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../clientes/middleware/authMiddleware');
const authenticateAdmin = require('../clientes/middleware/authMiddlewareAdmin');
const router = express.Router();
/**
 * Ruta para registrar un tipo de notificación
 */
router.post('/createTipoNotificacion', authenticateAdmin, async (req, res) => {
    const { tipo, mensaje_plantilla } = req.body; // Solo recibimos estos campos desde el cliente

    try {
        // Validar campos obligatorios
        if (!tipo || !mensaje_plantilla) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: tipo, mensaje_plantilla.' });
        }

        const db = admin.firestore();
        const tiposNotificacionesRef = db.collection('tipos_notificaciones');

        // Crear un nuevo documento en la colección (Firestore genera el ID automáticamente)
        const newTipoNotificacion = {
            tipo,
            mensaje_plantilla,
        };

        const docRef = await tiposNotificacionesRef.add(newTipoNotificacion);

        // Agregar el ID generado al objeto de respuesta
        const tipoNotificacionConId = { id_tipo_notificacion: docRef.id, ...newTipoNotificacion };

        return res.status(201).json({
            message: 'Tipo de notificación registrado con éxito.',
            tipoNotificacion: tipoNotificacionConId,
        });
    } catch (error) {
        console.error('Error al registrar el tipo de notificación:', error);
        return res.status(500).json({ message: 'Error al registrar el tipo de notificación', error: error.message });
    }
});



/**
 * Ruta para crear una notificación
 */
router.post('/createNotificacion', authenticateAdmin, async (req, res) => {
    const { id_usuario, id_dispositivo, tipo_notificacion_id, parametros } = req.body;

    try {
        // Validar campos obligatorios
        if (!id_usuario || !id_dispositivo || !tipo_notificacion_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: id_usuario, id_dispositivo, tipo_notificacion_id.' });
        }

        // Obtener el tipo de notificación
        const tipoNotificacionSnapshot = await admin.firestore().collection('tipos_notificaciones').doc(tipo_notificacion_id).get();
        if (!tipoNotificacionSnapshot.exists) {
            return res.status(404).json({ message: 'Tipo de notificación no encontrado.' });
        }
        const tipoNotificacion = tipoNotificacionSnapshot.data();

        // Personalizar el mensaje
        let mensaje = tipoNotificacion.mensaje_plantilla;
        if (parametros) {
            Object.keys(parametros).forEach((key) => {
                mensaje = mensaje.replace(`{{${key}}}`, parametros[key]);
            });
        }

        // Crear la notificación
        const nuevaNotificacion = {
            mensaje,
            id_usuario,
            id_dispositivo,
            tipo_notificacion_id,
            fecha_envio: admin.firestore.FieldValue.serverTimestamp(),
        };

        const notificacionRef = await admin.firestore().collection('notificaciones').add(nuevaNotificacion);

        return res.status(201).json({ message: 'Notificación creada con éxito.', id: notificacionRef.id, ...nuevaNotificacion });
    } catch (error) {
        console.error('Error al crear la notificación:', error);
        return res.status(500).json({ message: 'Error al crear la notificación', error: error.message });
    }
});


/**
 * Ruta para obtener las notificaciones de un usuario autenticado
 */
router.get('/misNotificaciones', authenticate, async (req, res) => {
    const userId = req.userId;

    try {
        // Obtener todas las notificaciones del usuario
        const snapshot = await admin.firestore().collection('notificaciones').where('id_usuario', '==', userId).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron notificaciones para este usuario.' });
        }

        const notificaciones = [];
        const tipoNotificacionesCache = {}; // Cache para evitar múltiples consultas para el mismo tipo

        for (const doc of snapshot.docs) {
            const notificacion = { id: doc.id, ...doc.data() };

            // Verificar si el tipo ya está en caché
            if (!tipoNotificacionesCache[notificacion.tipo_notificacion_id]) {
                const tipoSnapshot = await admin
                    .firestore()
                    .collection('tipos_notificaciones')
                    .doc(notificacion.tipo_notificacion_id)
                    .get();

                if (tipoSnapshot.exists) {
                    tipoNotificacionesCache[notificacion.tipo_notificacion_id] = tipoSnapshot.data().tipo;
                } else {
                    tipoNotificacionesCache[notificacion.tipo_notificacion_id] = null; // Tipo no encontrado
                }
            }

            // Agregar solo el nombre del tipo al resultado
            notificacion.tipo = tipoNotificacionesCache[notificacion.tipo_notificacion_id];

            notificaciones.push(notificacion);
        }

        return res.status(200).json(notificaciones);
    } catch (error) {
        console.error('Error al obtener las notificaciones:', error);
        return res.status(500).json({ message: 'Error al obtener las notificaciones', error: error.message });
    }
});


/**
 * Ruta para obtener todos los tipos de notificaciones
 */
router.get('/getTiposNotificaciones', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('tipos_notificaciones').get();
        const tiposNotificaciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(tiposNotificaciones);
    } catch (error) {
        console.error('Error al obtener los tipos de notificaciones:', error);
        return res.status(500).json({ message: 'Error al obtener los tipos de notificaciones', error: error.message });
    }
});

/**
 * Ruta para actualizar un tipo de notificación
 */
router.put('/updateTipoNotificacion', authenticateAdmin, async (req, res) => {
    const { id, tipo, mensaje_plantilla } = req.body;

    try {
        if (!id || (!tipo && !mensaje_plantilla)) {
            return res.status(400).json({ message: 'Debe proporcionar el ID del tipo de notificación y al menos un campo para actualizar.' });
        }

        const tipoNotificacionRef = admin.firestore().collection('tipos_notificaciones').doc(id);
        const doc = await tipoNotificacionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Tipo de notificación no encontrado.' });
        }

        const updates = {};
        if (tipo) updates.tipo = tipo;
        if (mensaje_plantilla) updates.mensaje_plantilla = mensaje_plantilla;

        await tipoNotificacionRef.update(updates);

        return res.status(200).json({ message: 'Tipo de notificación actualizado con éxito.', updates });
    } catch (error) {
        console.error('Error al actualizar el tipo de notificación:', error);
        return res.status(500).json({ message: 'Error al actualizar el tipo de notificación', error: error.message });
    }
});

/**
 * Ruta para eliminar un tipo de notificación
 */
router.delete('/deleteTipoNotificacion', authenticateAdmin, async (req, res) => {
    const { id } = req.body;

    try {
        if (!id) {
            return res.status(400).json({ message: 'Debe proporcionar el ID del tipo de notificación.' });
        }

        const tipoNotificacionRef = admin.firestore().collection('tipos_notificaciones').doc(id);
        const doc = await tipoNotificacionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Tipo de notificación no encontrado.' });
        }

        await tipoNotificacionRef.delete();

        return res.status(200).json({ message: 'Tipo de notificación eliminado con éxito.' });
    } catch (error) {
        console.error('Error al eliminar el tipo de notificación:', error);
        return res.status(500).json({ message: 'Error al eliminar el tipo de notificación', error: error.message });
    }
});

module.exports = router;
