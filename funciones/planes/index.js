// functions/planes/index.js
const express = require('express');
const admin = require('firebase-admin');

// Inicializa el enrutador de Express
const router = express.Router();

// Obtener todos los planes
router.get('/getPlanes', async (req, res) => {
    try {
        const planesSnapshot = await admin.firestore().collection('planes').get();
        if (planesSnapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron planes' });
        }
        const planes = planesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ message: 'Planes obtenidos con éxito', data: planes });
    } catch (error) {
        console.error('Error al obtener planes:', error);
        return res.status(500).json({ message: 'Error al obtener planes', error: error.message });
    }
});

// Puedes agregar más funciones relacionadas con planes aquí

module.exports = router;
