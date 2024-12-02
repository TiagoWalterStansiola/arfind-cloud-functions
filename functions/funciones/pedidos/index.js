const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const authenticateEmpleado = require('../../funciones/clientes/middleware/authMiddlewareEmpleado');
const router = express.Router();

// Ruta para crear un nuevo pedido
router.post('/createPedido', authenticate, async (req, res) => {
    const { items, direccion } = req.body; // Obtiene los items y la dirección de la solicitud
    const usuario_id = req.userId; // Obtiene el usuario_id desde el middleware

    try {
        const db = admin.firestore();
        const pedidos = [];

        for (const item of items) {
            const { id_producto, plan_id } = item;

            // Buscar un dispositivo disponible para el producto
            const dispositivoSnapshot = await db.collection('dispositivos')
                .where('producto_id', '==', id_producto)
                .where('usuario_id', '==', null)
                .limit(1)
                .get();

            if (dispositivoSnapshot.empty) {
                return res.status(404).json({ message: `No hay dispositivos disponibles para el producto con id ${id_producto}` });
            }

            const dispositivoDoc = dispositivoSnapshot.docs[0];
            const dispositivoId = dispositivoDoc.id;

            // Asignar el dispositivo al usuario
            await dispositivoDoc.ref.update({ usuario_id, plan_id });

            // Crear el pedido
            const newPedido = {
                usuario_id,
                producto_id: id_producto,
                is_entregado: false,
                id_pedido: dispositivoId, // Usar el ID del dispositivo como ID único del pedido
                fecha_solicitud: admin.firestore.FieldValue.serverTimestamp(),
                direccion,
                fecha_entrega: null
            };

            // Guardar el pedido
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
