// functions/auth.js
const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });
        return res.status(201).json({ message: 'Usuario registrado con éxito', userId: userRecord.uid });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        return res.status(500).json({ message: 'Error al registrar el usuario', error: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Here, Firebase Authentication Client SDK should be used to get the token after login (not on server-side)
        // For now, we'll send a message that login would happen client-side.
        return res.status(200).json({ message: 'Inicio de sesión simulado, se debe manejar el inicio de sesión en el lado del cliente.' });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
});

module.exports = router;
