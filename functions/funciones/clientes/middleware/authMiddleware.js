// functions/middleware/authMiddleware.js
const admin = require('firebase-admin');

// Middleware to verify Firebase Auth ID Token
const authenticate = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        return res.status(401).json({ message: 'No se proporcionó un token de autenticación' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        return next();
    } catch (error) {
        console.error('Error al verificar el token:', error);
        return res.status(403).json({ message: 'No autorizado', error: error.message });
    }
};

module.exports = authenticate;



