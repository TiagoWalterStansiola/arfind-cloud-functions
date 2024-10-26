const functions = require('firebase-functions');
const admin = require('firebase-admin');

/******************************************************************************************************************************************************************
 *                ABM PLANES                                                                                                                                      *
 *    Módulo para la gestión de planes en Firestore con acceso restringido a administradores.                                                                     *                                                                      *
 *                                                                                                                                                                *
 *    Contiene funciones:                                                                                                                                         *
 *       - crearPlan                                                                                                                                              *
 *       - obtenerPlanes                                                                                                                                          *
 *       - actualizarPlan                                                                                                                                         *
 *       - eliminarPlan                                                                                                                                           *
 *    Deploy del modulo:                                                                                                                                          *
 *    firebase deploy --only functions:crearPlan,functions:obtenerPlanes,functions:actualizarPlan,functions:eliminarPlan                                          *
 ******************************************************************************************************************************************************************/

// Middleware de autenticación y verificación de rol de administrador en la colección "Empleados"
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Verificar el token del usuario
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Buscar al usuario en la colección "Empleados" para verificar el rol de administrador
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

// Crear un nuevo plan
exports.crearPlan = functions.https.onRequest((req, res) => {
    authenticateAdmin(req, res, async () => {
      const { precio, descripcion, refresco, cantidad_compartidos, imagen } = req.body;
  
      // Verificar que se hayan pasado todos los datos necesarios
      if (typeof precio !== 'number' || typeof refresco !== 'number' ||
          typeof cantidad_compartidos !== 'number' || typeof descripcion !== 'string' || typeof imagen !== 'string') {
        return res.status(400).json({ message: 'Invalid plan data' });
      }
  
      try {
        // Crear un nuevo objeto plan sin el ID
        const newPlan = { precio, descripcion, refresco, cantidad_compartidos, imagen };
        
        // Agregar el nuevo plan a la colección "planes" y obtener la referencia del documento
        const planRef = await admin.firestore().collection('planes').add(newPlan);
        
        // Obtener el ID del documento generado automáticamente
        const planId = planRef.id;
        
        // Responder con el mensaje de éxito y el nuevo plan, incluyendo su ID
        return res.status(201).json({ message: 'Plan creado con éxito', plan: { id: planId, ...newPlan } });
      } catch (error) {
        return res.status(500).json({ message: 'Error al crear el plan', error: error.message });
      }
    });
  });
  

// Obtener todos los planes
exports.obtenerPlanes = functions.https.onRequest(async (req, res) => {
  try {
    const planesSnapshot = await admin.firestore().collection('planes').get();
    const planes = planesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ message: 'Planes obtenidos con éxito', data: planes });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener planes', error: error.message });
  }
});

// Actualizar un plan
exports.actualizarPlan = functions.https.onRequest((req, res) => {
  authenticateAdmin(req, res, async () => {
    const { id, precio, descripcion, refresco, cantidad_compartidos, imagen } = req.body;

    if (typeof id !== 'number' || typeof precio !== 'number' || typeof refresco !== 'number' ||
        typeof cantidad_compartidos !== 'number' || typeof descripcion !== 'string' || typeof imagen !== 'string') {
      return res.status(400).json({ message: 'Invalid plan data' });
    }

    try {
      const planRef = admin.firestore().collection('planes').doc(id.toString());
      await planRef.update({ precio, descripcion, refresco, cantidad_compartidos, imagen });
      return res.status(200).json({ message: 'Plan actualizado con éxito' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar el plan', error: error.message });
    }
  });
});

// Eliminar un plan
exports.eliminarPlan = functions.https.onRequest((req, res) => {
  authenticateAdmin(req, res, async () => {
    const { id } = req.body;

    if (typeof id !== 'number') {
      return res.status(400).json({ message: 'Plan ID is required and must be an integer' });
    }

    try {
      await admin.firestore().collection('planes').doc(id.toString()).delete();
      return res.status(200).json({ message: 'Plan eliminado con éxito' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar el plan', error: error.message });
    }
  });
});
