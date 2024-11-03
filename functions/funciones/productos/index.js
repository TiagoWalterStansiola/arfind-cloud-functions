const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const router = express.Router();

// FALTA EL (POST)CREATE_USER 
  
// Get all products (public route)
router.get('/productos', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('productos').get();
        const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return res.status(500).json({ message: 'Error al obtener productos', error: error.message });
    }
});

// Get a specific product by ID (public route)
router.get('/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const docRef = await admin.firestore().collection('productos').doc(id).get();
        if (!docRef.exists) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        return res.status(200).json({ id: docRef.id, ...docRef.data() });
    } catch (error) {
        console.error('Error al consultar el producto:', error);
        return res.status(500).json({ message: 'Error al consultar el producto', error: error.message });
    }
});

// Update a product (secure route)
router.patch('/productos/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { imagen, descripcion, tinydescripcion, titulo } = req.body; // Campos a actualizar

    try {
        const docRef = admin.firestore().collection('productos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        await docRef.update({
            imagen,
            descripcion,
            tinydescripcion,
            titulo,
        });
        return res.status(200).json({ message: 'Producto actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        return res.status(500).json({ message: 'Error al actualizar el producto', error: error.message });
    }
});

// Delete a product (secure route)
router.delete('/productos/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const docRef = admin.firestore().collection('productos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        await docRef.delete();
        return res.status(200).json({ message: 'Producto eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        return res.status(500).json({ message: 'Error al eliminar el producto', error: error.message });
    }
});

module.exports = router;
