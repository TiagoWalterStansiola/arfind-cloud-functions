const functions = require('firebase-functions');
const admin = require('firebase-admin');

/******************************************************************************************************************************************************************
 *                ABM EMPLEADOS                                                                                                                                   *
 *    Módulo para la gestión de empleados en Firestore con acceso restringido a administradores.                                                                  *
 *                                                                                                                                                                *
 *    Contiene funciones:                                                                                                                                         *
 *       - createEmpleado                                                                                                                                         *
 *       - getEmpleados                                                                                                                                           *
 *       - updateEmpleado                                                                                                                                         *
 *       - deleteEmpleado                                                                                                                                         *
 *    Deploy del módulo:                                                                                                                                          *
 *    firebase deploy --only functions:createEmpleado,functions:getEmpleados,functions:updateEmpleado,functions:deleteEmpleado                                    *
 ******************************************************************************************************************************************************************/

// Middleware de autenticación y verificación de rol de administrador en la colección "Empleados"
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const empleadoDoc = await admin.firestore().collection('Empleados').doc(decodedToken.uid).get();
    
    if (!empleadoDoc.exists || !empleadoDoc.data().is_admin) {
      return res.status(403).json({ message: 'Forbidden: Access is allowed only for administrators.' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized', error: error.message });
  }
};

// Crear un nuevo empleado
exports.createEmpleado = functions.https.onRequest((req, res) => {
  authenticateAdmin(req, res, async () => {
    const { email, is_admin, nombre, password } = req.body;

    // Verificar que los datos del empleado sean válidos
    if (typeof email !== 'string' || typeof is_admin !== 'boolean' || typeof nombre !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Datos de empleado inválidos' });
    }

    try {
      const newEmpleado = { email, is_admin, nombre, password };
      const empleadoRef = await admin.firestore().collection('Empleados').add(newEmpleado);
      const empleadoId = empleadoRef.id;

      return res.status(201).json({ message: 'Empleado creado con éxito', empleado: { id: empleadoId, ...newEmpleado } });
    } catch (error) {
      return res.status(500).json({ message: 'Error al crear el empleado', error: error.message });
    }
  });
});

// Obtener todos los empleados
exports.getEmpleados = functions.https.onRequest(async (req, res) => {
  try {
    const empleadosSnapshot = await admin.firestore().collection('Empleados').get();
    const empleados = empleadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ message: 'Empleados obtenidos con éxito', data: empleados });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener empleados', error: error.message });
  }
});

// Actualizar un empleado
exports.updateEmpleado = functions.https.onRequest((req, res) => {
  authenticateAdmin(req, res, async () => {
    const { id, email, is_admin, nombre, password } = req.body;

    // Verificar que los datos del empleado sean válidos
    if (typeof id !== 'string' || typeof email !== 'string' || typeof is_admin !== 'boolean' || typeof nombre !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Datos de empleado inválidos' });
    }

    try {
      const empleadoRef = admin.firestore().collection('Empleados').doc(id);
      await empleadoRef.update({ email, is_admin, nombre, password });
      return res.status(200).json({ message: 'Empleado actualizado con éxito' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar el empleado', error: error.message });
    }
  });
});

// Eliminar un empleado
exports.deleteEmpleado = functions.https.onRequest((req, res) => {
  authenticateAdmin(req, res, async () => {
    const { id } = req.body;

    // Verificar que se haya proporcionado el ID del empleado
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Se requiere el ID del empleado y debe ser un string' });
    }

    try {
      await admin.firestore().collection('Empleados').doc(id).delete();
      return res.status(200).json({ message: 'Empleado eliminado con éxito' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar el empleado', error: error.message });
    }
  });
});
