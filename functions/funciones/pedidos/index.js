// functions/funciones/pedidos/index.js
const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');




const router = express.Router();

// Create a new order (secure route)
router.post('/createPedido', authenticate, async (req, res) => {
    const { userId, items } = req.body;
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


module.exports = router;
