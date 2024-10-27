const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');

const router = express.Router();

// Create a new order (secure route)
router.post('/createPedido', authenticate, async (req, res) => {
    const { items } = req.body; // Obtiene los items del cuerpo de la solicitud
    const userId = req.userId; // Obtiene el userId del middleware
    try {
        const newPedido = {
            userId,
            items,
            status: 'No Entregado',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const docRef = await admin.firestore().collection('pedidos').add(newPedido);
        return res.status(201).json({ message: 'Pedido creado con éxito', id: docRef.id });
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
router.get('/pedidos/:id', authenticate, async (req, res) => {
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
router.patch('/pedidos/:id/status', authenticate, async (req, res) => {
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

