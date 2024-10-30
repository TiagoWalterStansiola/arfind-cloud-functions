// functions/empleados/index.js

const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const authenticateAdmin = require('../../funciones/clientes/middleware/authMiddlewareAdmin');


// Inicializa el enrutador de Express
const router = express.Router();

/******************************************************************************************************************************************************************
 *                ABM EMPLEADOS                                                                                                                                   *
 *    Módulo para la gestión de empleados en Firestore con acceso restringido a administradores.                                                                  *
 *                                                                                                                                                                *
 *    Contiene rutas:                                                                                                                                             *
 *       - POST /empleados/createEmpleado                                                                                                                         *
 *       - GET /empleados/getEmpleados                                                                                                                            *
 *       - PUT /empleados/updateEmpleado                                                                                                                          *
 *       - DELETE /empleados/deleteEmpleado                                                                                                                       *
 *       - POST /empleados/loginEmpleado                                                                                                                          *
 *    Deploy del módulo:                                                                                                                                          *
 *    firebase deploy --only functions:empleados                                                                                                                  *
 ******************************************************************************************************************************************************************/

// Crear un nuevo empleado
router.post('/createEmpleado', authenticateAdmin, async (req, res) => {
  const { email, is_admin, nombre, password } = req.body;

  // Validar que los datos sean del tipo correcto
  if (typeof email !== 'string' || typeof is_admin !== 'boolean' || typeof nombre !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Datos de empleado inválidos' });
  }

  try {
    // Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
    });

    // Agregar el UID del usuario creado a los datos de Firestore
    const newEmpleado = { email, is_admin, nombre, password, uid: userRecord.uid };
    
    // Guardar el documento en Firestore con el UID como ID del documento
    await admin.firestore().collection('empleados').doc(userRecord.uid).set(newEmpleado);
    
    return res.status(201).json({ message: 'Empleado creado con éxito', empleado: { id: userRecord.uid, ...newEmpleado } });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear el empleado', error: error.message });
  }
});


// Obtener todos los empleados
router.get('/getEmpleados', authenticateAdmin, async (req, res) => {
  try {
    const empleadosSnapshot = await admin.firestore().collection('empleados').get();
    const empleados = empleadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ message: 'Empleados obtenidos con éxito', data: empleados });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener empleados', error: error.message });
  }
});

// Actualizar un empleado
router.put('/updateEmpleado', authenticateAdmin, async (req, res) => {
  const { id, email, is_admin, nombre, password } = req.body;

  // Verificar que el ID esté presente y sea una cadena
  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'El ID del empleado es obligatorio y debe ser una cadena' });
  }

  // Crear un objeto de campos a actualizar, solo con los campos presentes en la solicitud
  const updatedFields = {};
  if (typeof email === 'string') updatedFields.email = email;
  if (typeof is_admin === 'boolean') updatedFields.is_admin = is_admin;
  if (typeof nombre === 'string') updatedFields.nombre = nombre;
  if (typeof password === 'string') updatedFields.password = password;

  // Verificar que al menos un campo esté presente para actualizar
  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ message: 'No se proporcionaron campos para actualizar' });
  }

  try {
    const empleadoRef = admin.firestore().collection('empleados').doc(id);
    await empleadoRef.update(updatedFields);
    return res.status(200).json({ message: 'Empleado actualizado con éxito' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar el empleado', error: error.message });
  }
});



// Eliminar un empleado
router.delete('/deleteEmpleado', authenticateAdmin, async (req, res) => {
  const { id } = req.body;

  // Validar que se proporcione el ID y que sea una cadena
  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Se requiere el ID del empleado y debe ser un string' });
  }

  try {
    // Eliminar el documento del empleado en Firestore
    await admin.firestore().collection('empleados').doc(id).delete();

    // Eliminar el usuario del sistema de autenticación
    await admin.auth().deleteUser(id);

    return res.status(200).json({ message: 'Empleado eliminado con éxito de Firestore y Authentication' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el empleado', error: error.message });
  }
});





module.exports = router;
