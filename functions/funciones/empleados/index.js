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

    // Validar datos del empleado
    if (typeof email !== 'string' || typeof is_admin !== 'boolean' || typeof nombre !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Datos de empleado inválidos' });
    }

    try {
      // Crear el usuario en el sistema de autenticación de Firebase
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: nombre,
      });
      
      // Almacenar datos adicionales en Firestore con el uid del usuario
      const newEmpleado = { email, is_admin, nombre, password };
      await admin.firestore().collection('Empleados').doc(userRecord.uid).set(newEmpleado);
      
      return res.status(201).json({ message: 'Empleado creado con éxito', empleado: { id: userRecord.uid, ...newEmpleado } });
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

// Login de empleado
exports.loginEmpleado = functions.https.onRequest(async (req, res) => {
  const { email, password } = req.body;

  // Validar que los campos email y password existen en el body de la solicitud
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email y password son requeridos y deben ser strings' });
  }

  try {
    // Buscar el empleado en Firestore
    const empleadosRef = admin.firestore().collection('Empleados');
    const empleadoSnapshot = await empleadosRef.where('email', '==', email).get();

    // Verificar que el empleado existe
    if (empleadoSnapshot.empty) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    const empleadoData = empleadoSnapshot.docs[0].data();

    // Verificar la contraseña
    if (empleadoData.password !== password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Generar un token de Firebase para el empleado
    const userRecord = await admin.auth().getUserByEmail(email);
    const token = await admin.auth().createCustomToken(userRecord.uid);

    return res.status(200).json({ message: 'Inicio de sesión exitoso', token });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
});
