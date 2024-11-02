
const admin = require('firebase-admin');
// Middleware de autenticación y verificación de rol de administrador en la colección "Empleados"
const authenticateEmpleado = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
  
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      // Verificar el token del usuario
      const decodedToken = await admin.auth().verifyIdToken(token);
  
      // Buscar al usuario en la colección "Empleados" para verificar el rol de administrador
      const empleadoDoc = await admin.firestore().collection('empleados').doc(decodedToken.uid).get();
  
      if (!empleadoDoc.exists) {
        return res.status(403).json({ message: 'Forbidden: Access is allowed only for employees.' });
      }
  
      req.user = decodedToken;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
  };

  module.exports = authenticateEmpleado;