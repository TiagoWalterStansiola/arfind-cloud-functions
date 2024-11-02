const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const authenticateEmpleado = require('../../funciones/clientes/middleware/authMiddlewareEmpleado');
const router = express.Router();


// Ruta para crear un nuevo pedido
router.post('/createPedido', authenticate, async (req, res) => {
    const { items, direccion } = req.body; // Obtiene los items y la dirección de la solicitud
    const userId = req.userId; // Obtiene el userId desde el middleware

    try {
        const db = admin.firestore();
        const pedidos = [];
        
        // Iterar por cada item solicitado
        for (const item of items) {
            const { id_producto, plan_id } = item; // Suponemos que `id_producto` es un identificador del producto en el pedido y `plan_id` el plan solicitado.

            // Buscar un dispositivo disponible que corresponda al producto
            const dispositivoSnapshot = await db.collection('dispositivos')
                .where('producto_id', '==', id_producto) // Esto asume que `producto_id` en dispositivos se relaciona con el producto solicitado
                .where('usuario_id', '==', null) // Verifica que el dispositivo esté libre
                .limit(1)
                .get();

            if (dispositivoSnapshot.empty) {
                return res.status(404).json({ message: `No hay dispositivos disponibles para el producto con id ${id_producto}` });
            }

            const dispositivoDoc = dispositivoSnapshot.docs[0];
            const dispositivoId = dispositivoDoc.id;

            // Actualizar el dispositivo para asignar el usuario y el plan
            await dispositivoDoc.ref.update({ usuario_id: userId, plan_id: plan_id });

            // Crear el pedido con la estructura adecuada
            const newPedido = {
                usuario_id: userId,
                producto_id: id_producto,
                is_entregado: false,
                id_pedido: Date.now(), // ID único para el pedido
                fecha_solicitud: admin.firestore.FieldValue.serverTimestamp(),
                direccion, // Dirección del pedido
                fecha_entrega: null // Inicialmente null hasta la entrega
            };

            // Guardar el pedido en la colección 'pedidos' y almacenar la referencia para la respuesta
            const pedidoRef = await db.collection('pedidos').add(newPedido);
            pedidos.push({ id: pedidoRef.id, ...newPedido });
        }

        // Responder con los detalles de los pedidos creados
        return res.status(201).json({ message: 'Pedidos creados con éxito', pedidos });
        
    } catch (error) {
        console.error('Error al crear el pedido:', error);
        return res.status(500).json({ message: 'Error al crear el pedido', error: error.message });
    }
});


// Get all orders for the authenticated user
router.get('/misPedidos', authenticate, async (req, res) => {
    const userId = req.userId; // Ahora usa req.userId
    try {
        const snapshot = await admin.firestore().collection('pedidos').where('userId', '==', userId).get();
        const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(pedidos);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        return res.status(500).json({ message: 'Error al obtener pedidos', error: error.message });
    }
});

// Get details of a specific order by ID
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

// Update the status of an order
router.patch('/pedidos/:id/status', authenticateEmpleado, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Debe ser "Entregado" o "No Entregado"
    if (!['Entregado', 'No Entregado'].includes(status)) {
        return res.status(400).json({ message: 'Estado inválido. Debe ser "Entregado" o "No Entregado".' });
    }
    try {
        const docRef = admin.firestore().collection('pedidos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        await docRef.update({ status });
        return res.status(200).json({ message: 'Estado del pedido actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el estado del pedido:', error);
        return res.status(500).json({ message: 'Error al actualizar el estado del pedido', error: error.message });
    }
});

module.exports = router;

