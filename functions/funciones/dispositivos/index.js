// functions/dispositivos.js
const express = require("express");
const admin = require("firebase-admin");
const db = admin.firestore();
const authenticate = require('../../funciones/clientes/middleware/authMiddleware');
const authenticateAdmin = require('../../funciones/clientes/middleware/authMiddlewareAdmin');

const router = express.Router();


// Rutas de dispositivos
// Obtener dispositivos por usuario autenticado usando solo el token
router.get("/getDispositivosByUsuario", authenticate, async (req, res) => {
  // Verificamos que req.userId esté definido
  if (!req.userId) {
    return res.status(401).send("Usuario no autenticado o token inválido.");
  }

  const usuarioId = req.userId;

  try {
    // Realiza la consulta con el uid del usuario como string directo
    const dispositivoSnapshot = await db
      .collection("dispositivos")
      .where("usuario_id", "==", usuarioId) // Compara el uid como string
      .get();

    if (dispositivoSnapshot.empty) {
      return res.status(404).send("No se encontraron dispositivos para este usuario.");
    }

    // Mapea los documentos encontrados a un array de dispositivos
    const dispositivos = dispositivoSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return res.status(200).json(dispositivos);
  } catch (error) {
    console.error("Error al obtener los dispositivos:", error.message); // Imprime el mensaje de error
    return res.status(500).send("Error al obtener los dispositivos.");
  }
});


// Obtener dispositivos donde el usuario está invitado
router.get("/getDispositivosInvitados", authenticate, async (req, res) => {
  const usuarioId = req.userId; // Obtiene el uid del usuario autenticado

  try {
    // Busca todos los dispositivos en Firestore donde el usuario está en usuarios_invitados
    const dispositivoSnapshot = await db.collection('dispositivos')
      .where('usuarios_invitados', 'array-contains', usuarioId)
      .get();

    if (dispositivoSnapshot.empty) {
      return res.status(404).send("No se encontraron dispositivos en los que este usuario está invitado.");
    }

    // Recorre todos los dispositivos encontrados y los almacena en un array
    const dispositivos = dispositivoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(dispositivos);
  } catch (error) {
    console.error("Error al obtener los dispositivos invitados:", error);
    return res.status(500).send("Error al obtener los dispositivos invitados.");
  }
});


// Crear dispositivo
router.post("/createDispositivo", authenticateAdmin, async (req, res) => {
  const { numero_telefonico, tipo_producto } = req.body;

  if (!numero_telefonico || !tipo_producto) {
    return res.status(400).json({ 
      message: 'Los campos numero_telefonico y tipo_producto son obligatorios.' 
    });
  }

  try {
    const newDevice = {
      numero_telefonico,
      tipo_producto,
      apodo: "", // Campo vacío por defecto
      bateria: null, // Valor inicial
      codigo_invitado: "", // Campo vacío
      fecha_creacion: admin.firestore.Timestamp.now(), // Fecha de creación actual
      plan_id: null, // Inicialmente sin plan asociado
      ubicacion: null, // Inicialmente sin ubicación
      ult_actualizacion: admin.firestore.Timestamp.now(), // Fecha de actualización actual
      usuario_id: null, // Inicialmente sin usuario asociado
      usuarios_invitados: [], // Lista vacía de usuarios invitados
    };

    const deviceRef = await db.collection('dispositivos').add(newDevice);
    return res.status(201).send({ 
      message: 'Dispositivo creado exitosamente', 
      deviceId: deviceRef.id, 
      dispositivo: newDevice 
    });
  } catch (error) {
    return res.status(500).send(`Error al crear dispositivo: ${error.message}`);
  }
});


// Actualizar dispositivo
router.put("/updateDispositivo", authenticateAdmin, async (req, res) => {
  const { deviceId, updatedData } = req.body; // Obtener el ID del dispositivo y los datos a actualizar del cuerpo de la solicitud

  if (typeof deviceId !== 'string') {
    return res.status(400).json({ message: 'Se requiere el ID del dispositivo y debe ser un string' });
  }

  try {
    // Obtener el documento del dispositivo
    const dispositivoRef = db.collection('dispositivos').doc(deviceId);
    const dispositivoDoc = await dispositivoRef.get();

    if (!dispositivoDoc.exists) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    // Crear un objeto para almacenar los campos actualizados
    const updatedFields = {};

    // Solo agregar los campos que están presentes en updatedData
    if (updatedData.usuario_id) {
      updatedFields.usuario_id = db.doc(`usuarios/${updatedData.usuario_id}`);
    }
    if (updatedData.plan_id) {
      updatedFields.plan_id = db.doc(`planes/${updatedData.plan_id}`);
    }
    if (updatedData.usuarios_invitados) {
      updatedFields.usuarios_invitados = updatedData.usuarios_invitados.map(uid => db.doc(`usuarios/${uid}`));
    }
    if (updatedData.ubicacion) {
      updatedFields.ubicacion = new admin.firestore.GeoPoint(updatedData.ubicacion.latitude, updatedData.ubicacion.longitude);
    }
    // Agregar la fecha de la última actualización
    updatedFields.ult_actualizacion = admin.firestore.Timestamp.now();

    // Verificar que al menos un campo esté presente para actualizar
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar' });
    }

    // Actualizar el documento del dispositivo en Firestore
    await dispositivoRef.update(updatedFields);
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

/* Funciones para el cliente */
// Modificar apodo del dispositivo
router.put("/updateApodoDispositivo", authenticate, async (req, res) => {
  const { deviceId, apodo } = req.body; // Obtener el ID del dispositivo y el nuevo apodo del cuerpo de la solicitud

  if (typeof deviceId !== 'string' || typeof apodo !== 'string') {
    return res.status(400).json({ message: 'Se requiere el ID del dispositivo y el nuevo apodo debe ser un string' });
  }

  try {
    const dispositivoRef = db.collection('dispositivos').doc(deviceId);
    const dispositivoDoc = await dispositivoRef.get();

    if (!dispositivoDoc.exists) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    // Actualizar el apodo
    await dispositivoRef.update({ apodo });

    return res.status(200).json({ message: 'Apodo del dispositivo actualizado exitosamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar el apodo del dispositivo', error: error.message });
  }
});
// Generar nuevo código de invitado
router.put("/generateCodigoInvitado", authenticate, async (req, res) => {
  const { deviceId } = req.body; // Obtener el ID del dispositivo del cuerpo de la solicitud

  if (typeof deviceId !== 'string') {
    return res.status(400).json({ message: 'Se requiere el ID del dispositivo y debe ser un string' });
  }

  try {
    const dispositivoRef = db.collection('dispositivos').doc(deviceId);
    const dispositivoDoc = await dispositivoRef.get();

    if (!dispositivoDoc.exists) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    // Generar un código de 6 dígitos aleatorios
    const codigoInvitado = Math.floor(100000 + Math.random() * 900000).toString();

    // Actualizar el campo codigo_invitado en el documento del dispositivo
    await dispositivoRef.update({ codigo_invitado: codigoInvitado });

    return res.status(200).json({ message: 'Código de invitado generado exitosamente', codigo_invitado: codigoInvitado });
  } catch (error) {
    return res.status(500).json({ message: 'Error al generar el código de invitado', error: error.message });
  }
});
// Submit código invitado
router.post("/submitCodigoInvitado", authenticate, async (req, res) => {
  const { codigo_invitado } = req.body; // Obtener el código invitado del cuerpo de la solicitud

  if (typeof codigo_invitado !== 'string') {
    return res.status(400).json({ message: 'Se requiere un código de invitado y debe ser un string' });
  }

  try {
    // Buscar el dispositivo por el código de invitado
    const dispositivosRef = db.collection('dispositivos');
    const dispositivosQuery = await dispositivosRef.where('codigo_invitado', '==', codigo_invitado).get();

    if (dispositivosQuery.empty) {
      return res.status(404).json({ message: 'Dispositivo no encontrado para el código de invitado proporcionado' });
    }

    // Suponemos que solo habrá un dispositivo por código de invitado
    const dispositivoDoc = dispositivosQuery.docs[0];
    const dispositivoData = dispositivoDoc.data();

    // Obtener el ID del plan y la cantidad máxima de usuarios invitados
    const planId = dispositivoData.plan_id.id; // Asumiendo que el plan_id es una referencia al documento del plan
    const planDoc = await db.collection('planes').doc(planId).get();

    if (!planDoc.exists) {
      return res.status(404).json({ message: 'Plan no encontrado' });
    }

    const planData = planDoc.data();
    const maxUsuariosInvitados = planData.cantidad_compartidos;

    // Verificar la cantidad actual de usuarios invitados
    const usuarios_invitados = dispositivoData.usuarios_invitados || [];
    if (usuarios_invitados.length >= maxUsuariosInvitados) {
      return res.status(403).json({ message: 'El número máximo de usuarios invitados ha sido alcanzado' });
    }

    // Verificar si el usuario ya está en la lista de usuarios invitados
    const userId = req.userId; // Obtener el userId del middleware
    if (usuarios_invitados.includes(userId)) {
      return res.status(400).json({ message: 'El usuario ya está en la lista de usuarios invitados' });
    }

    // Agregar el usuario a la lista de usuarios invitados
    await dispositivosRef.doc(dispositivoDoc.id).update({
      usuarios_invitados: admin.firestore.FieldValue.arrayUnion(userId) // Agregar el userId a la lista
    });

    return res.status(200).json({ message: 'Usuario agregado a los invitados exitosamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al procesar el código invitado', error: error.message });
  }
});


module.exports = router;
