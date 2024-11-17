const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // Tamaño máximo: 20 MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten archivos de imagen'), false);
        }
        cb(null, true);
    },
});

// Ruta para crear un producto
router.post('/createProducto', authenticate, upload.single('imagen'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'La imagen es obligatoria.' });
    }

    const { id_producto, descripcion, precio, tiny_descripcion, titulo } = req.body;

    if (!id_producto || !descripcion || !precio || !tiny_descripcion || !titulo) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // Procesar la imagen (redimensionar y optimizar)
        // const optimizedBuffer = await sharp(req.file.buffer)
        //     .resize({ width: 800 })
        //     .toFormat('jpeg')
        //     .jpeg({ quality: 80 })
        //     .toBuffer();
        const optimizedBuffer = req.file.buffer;


        const bucket = admin.storage().bucket();
        const extension = '.jpg'; // Forzamos la extensión a JPG
        const filename = `producto_${id_producto}_${Date.now()}${extension}`;
        const file = bucket.file(filename);

        await file.save(optimizedBuffer, {
            metadata: {
                contentType: 'image/jpeg',
                firebaseStorageDownloadTokens: uuidv4(),
            },
        });

        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;

        const producto = {
            id_producto,
            descripcion,
            imagen: imageUrl,
            precio: parseFloat(precio),
            tiny_descripcion,
            titulo,
            fecha_creacion: admin.firestore.Timestamp.now(),
        };

        await admin.firestore().collection('productos').add(producto);
        return res.status(201).json({ message: 'Producto agregado con éxito', producto });
    } catch (error) {
        console.error('Error al crear el producto:', error);
        return res.status(500).json({ message: 'Error interno al crear el producto', error: error.message });
    }
});

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
