const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const authenticate = require('./middleware/authMiddleware'); // Importa tu middleware de autenticación

// Endpoint para actualizar la información del usuario
router.put('/updateCliente', authenticate, async (req, res) => {
    const { userId } = req; // Obtener el UID del usuario autenticado desde el middleware
    const { nombre, apellido, telefono } = req.body; // Datos enviados en la solicitud

    if (!nombre && !apellido && !telefono) {
        return res.status(400).json({ message: 'Debe proporcionar al menos un campo para actualizar' });
    }

    try {
        // Referencia al documento del usuario en Firestore
        const userRef = admin.firestore().collection('usuarios').doc(userId);

        // Verificar si el usuario existe
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Construir el objeto con los campos a actualizar
        const updates = {};
        if (nombre) updates.nombre = nombre;
        if (apellido) updates.apellido = apellido;
        if (telefono) updates.telefono = telefono;
        updates.fecha_actualizacion = admin.firestore.FieldValue.serverTimestamp(); // Agregar timestamp de actualización

        // Actualizar el documento del usuario en Firestore
        await userRef.update(updates);

        return res.status(200).json({ message: 'Información actualizada con éxito', updates });
    } catch (error) {
        console.error('Error al actualizar la información del usuario:', error);
        return res.status(500).json({ message: 'Error al actualizar la información del usuario', error: error.message });
    }
});

// Endpoint para obtener la información del usuario
router.get('/getCliente', authenticate, async (req, res) => {
    const { userId } = req; // Obtener el UID del usuario autenticado desde el middleware

    try {
        // Referencia al documento del usuario en Firestore
        const userRef = admin.firestore().collection('usuarios').doc(userId);

        // Obtener el documento del usuario
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener los datos relevantes del usuario
        const { nombre, apellido, telefono, correo } = userDoc.data();

        return res.status(200).json({ nombre, apellido, telefono, correo });
    } catch (error) {
        console.error('Error al obtener la información del usuario:', error);
        return res.status(500).json({ message: 'Error al obtener la información del usuario', error: error.message });
    }
});

module.exports = router;
