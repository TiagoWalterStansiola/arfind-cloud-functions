const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');

// Ruta para obtener todos los productos
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

// Ruta para obtener un producto por ID
router.get('/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await admin.firestore().collection('productos').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        return res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error al consultar el producto:', error);
        return res.status(500).json({ message: 'Error al consultar el producto', error: error.message });
    }
});

// Ruta para actualizar un producto
router.patch('/productos/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { descripcion, tiny_descripcion, titulo, precio } = req.body;

    try {
        const docRef = admin.firestore().collection('productos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const updates = {};
        if (descripcion) updates.descripcion = descripcion;
        if (tiny_descripcion) updates.tiny_descripcion = tiny_descripcion;
        if (titulo) updates.titulo = titulo;
        if (precio) updates.precio = parseFloat(precio);

        await docRef.update(updates);
        return res.status(200).json({ message: 'Producto actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        return res.status(500).json({ message: 'Error al actualizar el producto', error: error.message });
    }
});

// Ruta para eliminar un producto
router.delete('/productos/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const docRef = admin.firestore().collection('productos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const { imagen } = doc.data();
        if (imagen) {
            const bucket = admin.storage().bucket();
            const filename = imagen.split('/').pop().split('?')[0]; // Extrae el nombre del archivo
            await bucket.file(decodeURIComponent(filename)).delete();
            console.log(`Imagen asociada al producto ${id} eliminada.`);
        }

        await docRef.delete();
        return res.status(200).json({ message: 'Producto eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        return res.status(500).json({ message: 'Error al eliminar el producto', error: error.message });
    }
});

module.exports = router;
