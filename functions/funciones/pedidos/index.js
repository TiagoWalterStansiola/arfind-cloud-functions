const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const authenticateEmpleado = require('../../funciones/clientes/middleware/authMiddlewareEmpleado');
const router = express.Router();
const { WEBHOOK_SECRET  } = require('../../config');

// Middleware para autenticar el Webhook
const authenticateWebhook = (req, res, next) => {
    const webhookKey = req.headers['x-webhook-key'];
    if (webhookKey !== WEBHOOK_SECRET) {
        console.error('Clave del webhook no coincide.');
        return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
};


// Ruta para crear un nuevo pedido (desde el Webhook)
// Ruta para crear un nuevo pedido (desde el Webhook)
router.post('/createPedido', authenticateWebhook, async (req, res) => {
    const { items, direccion, userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Usuario no identificado' });
    }

    try {
        const db = admin.firestore();
        const pedidos = [];

        for (const item of items) {
            const { id_producto, plan_id } = item;

            if (!id_producto || !plan_id) {
                return res.status(400).json({ message: 'Datos incompletos para crear el pedido.' });
            }

            const dispositivoSnapshot = await db.collection('dispositivos')
                .where('tipo_producto', '==', id_producto)
                .where('usuario_id', '==', null)
                .limit(1)
                .get();

            if (dispositivoSnapshot.empty) {
                return res.status(404).json({ message: `No hay dispositivos disponibles para el producto con id ${id_producto}` });
            }

            const dispositivoDoc = dispositivoSnapshot.docs[0];
            const dispositivoId = dispositivoDoc.id;

            await dispositivoDoc.ref.update({
                usuario_id: userId,
                plan_id, // Asigna el plan al dispositivo
                ult_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            });

            const fechaEntrega = admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
            );

            const newPedido = {
                usuario_id: userId,
                producto_id: id_producto,
                is_entregado: false,
                id_dispositivo: dispositivoId,
                fecha_solicitud: admin.firestore.FieldValue.serverTimestamp(),
                direccion: direccion || 'Corrientes 2037',
                fecha_entrega: fechaEntrega,
                plan_id // Asigna el plan al pedido
            };

            const pedidoRef = await db.collection('pedidos').add(newPedido);
            pedidos.push({ id: pedidoRef.id, ...newPedido });
        }

        return res.status(201).json({ message: 'Pedidos creados con éxito', pedidos });
    } catch (error) {
        console.error('Error al crear el pedido:', error);
        return res.status(500).json({ message: 'Error al crear el pedido', error: error.message });
    }
});







// Obtener todos los pedidos del usuario autenticado
router.get('/getPedidosByUsuario', authenticate, async (req, res) => {
    const usuario_id = req.userId;
    try {
        const snapshot = await admin.firestore().collection('pedidos').where('usuario_id', '==', usuario_id).get();
        const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(pedidos);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        return res.status(500).json({ message: 'Error al obtener pedidos', error: error.message });
    }
});

// Obtener detalles de un pedido por ID
router.get('/pedidos/:id', authenticateEmpleado, async (req, res) => {
    const { id } = req.params;
    try {
        const docRef = await admin.firestore().collection('pedidos').doc(id).get();
        if (!docRef.exists) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        return res.status(200).json({ id: docRef.id, ...docRef.data() });
    } catch (error) {
        console.error('Error al consultar el pedido:', error);
        return res.status(500).json({ message: 'Error al consultar el pedido', error: error.message });
    }
});

// Actualizar estado de un pedido
router.patch('/pedidos/:id/status', authenticateEmpleado, async (req, res) => {
    const { id } = req.params;
    const { is_entregado } = req.body; // booleano

    if (typeof is_entregado !== 'boolean') {
        return res.status(400).json({ message: 'El estado "is_entregado" debe ser booleano.' });
    }

    try {
        const docRef = admin.firestore().collection('pedidos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        await docRef.update({ is_entregado, fecha_entrega: is_entregado ? admin.firestore.FieldValue.serverTimestamp() : null });
        return res.status(200).json({ message: 'Estado del pedido actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el estado del pedido:', error);
        return res.status(500).json({ message: 'Error al actualizar el estado del pedido', error: error.message });
    }
});

module.exports = router;
