// functions/dispositivos.js
const express = require("express");
const admin = require("firebase-admin");
const db = admin.firestore();

const router = express.Router();

// Middleware para verificar si el usuario está autenticado
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    return res.status(403).send("El token es requerido.");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next(); // Continúa con la ejecución si el token es válido
  } catch (error) {
    return res.status(403).send("Token inválido.");
  }
};

// Middleware para verificar si el usuario es administrador
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    return res.status(403).send("El token es requerido.");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    if (userRecord.customClaims && userRecord.customClaims.isAdmin) {
      req.user = decodedToken;
      next();
    } else {
      return res.status(403).send("Acceso denegado. Solo administradores.");
    }
  } catch (error) {
    return res.status(403).send("Token inválido.");
  }
};

// Rutas de dispositivos


// Obtener dispositivos por usuario autenticado usando solo el token
router.get("/getDispositivosByUsuario", authenticateUser, async (req, res) => {
  const usuarioId = req.user.uid; // Obtiene el uid del usuario autenticado

  try {
    // Busca todos los dispositivos en Firestore asociados al usuario autenticado
    const dispositivoSnapshot = await db.collection('dispositivos').where('usuario_id', '==', db.doc(`Usuarios/${usuarioId}`)).get();

    if (dispositivoSnapshot.empty) {
      return res.status(404).send("No se encontraron dispositivos para este usuario.");
    }

    // Recorre todos los dispositivos encontrados y los almacena en un array
    const dispositivos = dispositivoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(dispositivos);
  } catch (error) {
    console.error("Error al obtener los dispositivos:", error);
    return res.status(500).send("Error al obtener los dispositivos.");
  }
});


// Crear dispositivo
router.post("/createDispositivo", authenticateAdmin, async (req, res) => {
  const {numero_telefonico } = req.body;

  try {
    const newDevice = {
      numero_telefonico,
      fecha_creacion: admin.firestore.Timestamp.now(),
    };

    const deviceRef = await db.collection('dispositivos').add(newDevice);
    return res.status(201).send({ message: 'Dispositivo creado exitosamente', deviceId: deviceRef.id });
  } catch (error) {
    return res.status(500).send(`Error al crear dispositivo: ${error.message}`);
  }
});

// Actualizar dispositivo
router.put("/updateDispositivo", authenticateAdmin, async (req, res) => {
  const { deviceId } = req.params;
  const updatedData = req.body;

  try {
    const updatedFields = {
      ...updatedData,
      usuario_id: updatedData.usuario_id ? db.doc(`Usuarios/${updatedData.usuario_id}`) : undefined,
      plan_id: updatedData.plan_id ? db.doc(`Planes/${updatedData.plan_id}`) : undefined,
      usuarios_invitados: updatedData.usuarios_invitados ? updatedData.usuarios_invitados.map(uid => db.doc(`Usuarios/${uid}`)) : undefined,
      ubicacion: updatedData.ubicacion ? new admin.firestore.GeoPoint(updatedData.ubicacion.latitude, updatedData.ubicacion.longitude) : undefined,
      ult_actualizacion: admin.firestore.Timestamp.now()
    };

    Object.keys(updatedFields).forEach(key => updatedFields[key] === undefined && delete updatedFields[key]);

    await db.collection('dispositivos').doc(deviceId).update(updatedFields);
    return res.status(200).send({ message: 'Dispositivo actualizado exitosamente' });
  } catch (error) {
    return res.status(500).send(`Error al actualizar dispositivo: ${error.message}`);
  }
});

// Eliminar dispositivo
router.delete("/deleteDispositivo", authenticateAdmin, async (req, res) => {
  const { deviceId } = req.params;

  try {
    await db.collection('dispositivos').doc(deviceId).delete();
    return res.status(200).send({ message: 'Dispositivo eliminado exitosamente' });
  } catch (error) {
    return res.status(500).send(`Error al eliminar dispositivo: ${error.message}`);
  }
});

// Listar dispositivos
router.get("/getAllDispositivos", authenticateAdmin, async (req, res) => {
  try {
    const devicesSnapshot = await db.collection('dispositivos').get();
    const devices = devicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).send(devices);
  } catch (error) {
    return res.status(500).send(`Error al obtener dispositivos: ${error.message}`);
  }
});

module.exports = router;
