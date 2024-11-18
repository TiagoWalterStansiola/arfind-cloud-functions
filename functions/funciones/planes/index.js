// functions/planes/index.js

const express = require('express');
const admin = require('firebase-admin');
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const authenticateAdmin = require('../../funciones/clientes/middleware/authMiddlewareAdmin');



// Inicializa el enrutador de Express
const router = express.Router();

/******************************************************************************************************************************************************************
 *                ABM PLANES                                                                                                                                      *
 *    Módulo para la gestión de planes en Firestore con acceso restringido a administradores.                                                                     *                                                                      *
 *                                                                                                                                                                *
 *    Contiene rutas:                                                                                                                                             *
 *       - POST /planes/createPlan                                                                                                                                *
 *       - GET /planes/getPlanes                                                                                                                                   *
 *       - PUT /planes/updatePlan                                                                                                                                 *
 *       - DELETE /planes/deletePlan                                                                                                                              *
 *    Deploy del módulo:                                                                                                                                          *
 *    firebase deploy --only functions:planes                                                                                                                     *
 ******************************************************************************************************************************************************************/

// Crear un nuevo plan
router.post('/createPlan', authenticateAdmin, async (req, res) => {
  const { nombre, precio, descripcion, refresco, cantidad_compartidos, imagen } = req.body;

  // Verificar que se hayan pasado todos los datos necesarios
  if (typeof nombre !== 'string' || typeof precio !== 'number' || typeof refresco !== 'number' ||
      typeof cantidad_compartidos !== 'number' || typeof descripcion !== 'string' || typeof imagen !== 'string') {
    return res.status(400).json({ message: 'Datos de plan inválidos' });
  }

  try {
    const newPlan = { nombre, precio, descripcion, refresco, cantidad_compartidos, imagen };
    const planRef = await admin.firestore().collection('planes').add(newPlan);
    const planId = planRef.id;
    return res.status(201).json({ message: 'Plan creado con éxito', plan: { id: planId, ...newPlan } });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear el plan', error: error.message });
  }
});


// Obtener todos los planes
router.get('/getPlanes', async (req, res) => {
  try {
    const planesSnapshot = await admin.firestore().collection('planes').get();
    const planes = planesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ message: 'Planes obtenidos con éxito', data: planes });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener planes', error: error.message });
  }
});


// Actualizar un plan
router.put('/updatePlan', authenticateAdmin, async (req, res) => {
  const { id, nombre, precio, descripcion, refresco, cantidad_compartidos, imagen } = req.body;

  // Verificar que se proporcione el ID y que sea una cadena
  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Se requiere el ID del plan y debe ser un string' });
  }

  // Crear un objeto de campos a actualizar, solo con los campos presentes en la solicitud
  const updatedFields = {};

  // Comprobar si cada campo es válido y agregarlo a updatedFields
  if (typeof nombre === 'string') updatedFields.nombre = nombre;
  if (typeof precio === 'number') updatedFields.precio = precio;
  if (typeof descripcion === 'string') updatedFields.descripcion = descripcion;
  if (typeof refresco === 'number') updatedFields.refresco = refresco;
  if (typeof cantidad_compartidos === 'number') updatedFields.cantidad_compartidos = cantidad_compartidos;
  if (typeof imagen === 'string') updatedFields.imagen = imagen;

  // Verificar que al menos un campo esté presente para actualizar
  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar' });
  }

  try {
    const planRef = admin.firestore().collection('planes').doc(id);
    await planRef.update(updatedFields);
    return res.status(200).json({ message: 'Plan actualizado con éxito' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar el plan', error: error.message });
  }
});


// Eliminar un plan
router.delete('/deletePlan', authenticateAdmin, async (req, res) => {
  const { id } = req.body;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Se requiere el ID del plan y debe ser un string' });
  }

  try {
    await admin.firestore().collection('planes').doc(id).delete();
    return res.status(200).json({ message: 'Plan eliminado con éxito' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el plan', error: error.message });
  }
});

module.exports = router;
