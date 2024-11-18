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
  if (!req.userId) {
    return res.status(401).send("Usuario no autenticado o token inválido.");
  }

  const usuarioId = req.userId;

  try {
    // Consultar dispositivos directamente usando el ID del usuario
    const dispositivoSnapshot = await db
      .collection("dispositivos")
      .where("usuario_id", "==", usuarioId) // Comparar con el ID
      .get();

    if (dispositivoSnapshot.empty) {
      return res.status(404).send("No se encontraron dispositivos para este usuario.");
    }

    // Obtener los dispositivos y agregar refresco desde el plan
    const dispositivos = await Promise.all(
      dispositivoSnapshot.docs.map(async doc => {
        const data = doc.data();
        let refresco = null;

        if (data.plan_id) {
          const planDoc = await db.collection("planes").doc(data.plan_id).get();
          if (planDoc.exists) {
            refresco = planDoc.data().refresco || null;
          }
        }

        return {
          id: doc.id,
          ...data,
          refresco, // Agregar refresco
        };
      })
    );

    return res.status(200).json(dispositivos);
  } catch (error) {
    console.error("Error al obtener los dispositivos:", error.message);
    return res.status(500).send("Error al obtener los dispositivos.");
  }
});





// Obtener dispositivos donde el usuario está invitado
router.get("/getDispositivosInvitados", authenticate, async (req, res) => {
  if (!req.userId) {
    return res.status(401).send("Usuario no autenticado o token inválido.");
  }

  const usuarioId = req.userId;

  try {
    // Buscar dispositivos donde el usuario esté como invitado
    const dispositivoSnapshot = await db
      .collection("dispositivos")
      .where("usuarios_invitados", "array-contains", usuarioId) // Compara con el ID directamente
      .get();

    if (dispositivoSnapshot.empty) {
      return res.status(404).json({ message: "No se encontraron dispositivos en los que este usuario está invitado." });
    }

    // Obtener los dispositivos y agregar refresco desde el plan
    const dispositivos = await Promise.all(
      dispositivoSnapshot.docs.map(async doc => {
        const data = doc.data();
        let refresco = null;

        if (data.plan_id) {
          const planDoc = await db.collection("planes").doc(data.plan_id).get();
          if (planDoc.exists) {
            refresco = planDoc.data().refresco || null;
          }
        }

        return {
          id: doc.id,
          ...data,
          refresco, // Agregar refresco
        };
      })
    );

    return res.status(200).json(dispositivos);
  } catch (error) {
    console.error("Error al obtener los dispositivos invitados:", error.message);
    return res.status(500).json({ message: "Error al obtener los dispositivos invitados.", error: error.message });
  }
});




// Crear dispositivo
router.post("/createDispositivo", authenticateAdmin, async (req, res) => {
  const { numero_telefonico, tipo_producto } = req.body;

  if (!numero_telefonico || !tipo_producto) {
    return res.status(400).json({ message: 'Los campos numero_telefonico y tipo_producto son obligatorios.' });
  }

  try {
    // Validar que el tipo de producto exista
    const tipoProductoDoc = await db.collection('productos').doc(tipo_producto).get();
    if (!tipoProductoDoc.exists) {
      return res.status(404).json({ message: 'El tipo de producto proporcionado no existe.' });
    }

    const tipoProductoData = tipoProductoDoc.data();
    const apodo = tipoProductoData.titulo || "Producto sin título";

    const newDevice = {
      numero_telefonico,
      tipo_producto, // Guardar el ID
      apodo,
      bateria: null,
      codigo_invitado: "",
      fecha_creacion: admin.firestore.Timestamp.now(),
      plan_id: null,
      ubicacion: null,
      ult_actualizacion: admin.firestore.Timestamp.now(),
      usuario_id: null,
      usuarios_invitados: [],
    };

    const deviceRef = await db.collection("dispositivos").add(newDevice);

    return res.status(201).json({
      message: "Dispositivo creado exitosamente",
      deviceId: deviceRef.id,
      dispositivo: newDevice,
    });
  } catch (error) {
    console.error("Error al crear dispositivo:", error.message);
    return res.status(500).json({ message: `Error al crear dispositivo: ${error.message}` });
  }
});

// Actualizar dispositivo
router.put("/updateDispositivo", authenticateAdmin, async (req, res) => {
  const { deviceId, updatedData } = req.body;

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ message: "Se requiere el ID del dispositivo y debe ser un string." });
  }

  try {
    const dispositivoRef = db.collection("dispositivos").doc(deviceId);
    const dispositivoDoc = await dispositivoRef.get();

    if (!dispositivoDoc.exists) {
      return res.status(404).json({ message: "Dispositivo no encontrado." });
    }

    const dispositivoData = dispositivoDoc.data();
    const updatedFields = {};

    // Validar y actualizar usuario_id
    if (updatedData.usuario_id) {
      const usuarioDoc = await db.collection("usuarios").doc(updatedData.usuario_id).get();
      if (!usuarioDoc.exists) {
        return res.status(400).json({ message: "El usuario_id proporcionado no existe." });
      }
      updatedFields.usuario_id = updatedData.usuario_id; // Guardar el ID directamente
    }

    // Validar y actualizar plan_id
    if (updatedData.plan_id) {
      const planDoc = await db.collection("planes").doc(updatedData.plan_id).get();
      if (!planDoc.exists) {
        return res.status(400).json({ message: "El plan_id proporcionado no existe." });
      }
      updatedFields.plan_id = updatedData.plan_id; // Guardar el ID directamente
    }

    // Validar y actualizar tipo_producto
    if (updatedData.tipo_producto) {
      const productoDoc = await db.collection("productos").doc(updatedData.tipo_producto).get();
      if (!productoDoc.exists) {
        return res.status(400).json({ message: "El tipo_producto proporcionado no existe." });
      }
      updatedFields.tipo_producto = updatedData.tipo_producto; // Guardar el ID directamente
    }

    // Validar y actualizar usuarios_invitados
    if (updatedData.usuarios_invitados) {
      const usuariosValidos = [];
      const usuariosSet = new Set();

      // Validar duplicados y existencia de usuarios
      for (const uid of updatedData.usuarios_invitados) {
        if (usuariosSet.has(uid)) {
          return res.status(400).json({ message: `El usuario invitado con ID ${uid} está duplicado.` });
        }
        const usuarioDoc = await db.collection("usuarios").doc(uid).get();
        if (!usuarioDoc.exists) {
          return res.status(400).json({ message: `El usuario invitado con ID ${uid} no existe.` });
        }
        usuariosValidos.push(uid); // Agregar el ID al array
        usuariosSet.add(uid);
      }

      // Validar el número máximo de invitados permitido por el plan
      const planId = updatedData.plan_id || dispositivoData.plan_id;
      if (planId) {
        const planDoc = await db.collection("planes").doc(planId).get();
        if (!planDoc.exists) {
          return res.status(400).json({ message: "El plan asociado no existe." });
        }
        const cantidadMaxInvitados = planDoc.data().cantidad_compartidos || 0;
        if (usuariosValidos.length > cantidadMaxInvitados) {
          return res.status(400).json({
            message: `El número máximo de usuarios invitados permitidos para este plan es ${cantidadMaxInvitados}.`,
          });
        }
      }

      updatedFields.usuarios_invitados = usuariosValidos;
    }

    // Validar y actualizar ubicación
    if (updatedData.ubicacion) {
      const { latitude, longitude } = updatedData.ubicacion;
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ message: "La ubicación debe contener latitude y longitude como números." });
      }
      updatedFields.ubicacion = new admin.firestore.GeoPoint(latitude, longitude);
    }

    // Validar y actualizar apodo
    if (updatedData.apodo) {
      if (typeof updatedData.apodo !== "string" || !updatedData.apodo.trim()) {
        return res.status(400).json({ message: "El apodo debe ser un string no vacío." });
      }
      updatedFields.apodo = updatedData.apodo.trim();
    }

    // Validar y actualizar código invitado
    if (updatedData.codigo_invitado) {
      if (typeof updatedData.codigo_invitado !== "string" || !updatedData.codigo_invitado.trim()) {
        return res.status(400).json({ message: "El código invitado debe ser un string no vacío." });
      }
      updatedFields.codigo_invitado = updatedData.codigo_invitado.trim();
    }

    // Actualizar el campo de última actualización
    updatedFields.ult_actualizacion = admin.firestore.Timestamp.now();

    // Verificar que al menos un campo esté presente para actualizar
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: "No se proporcionaron campos válidos para actualizar." });
    }

    // Actualizar el dispositivo en Firestore
    await dispositivoRef.update(updatedFields);

    return res.status(200).json({ message: "Dispositivo actualizado exitosamente." });
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error.message);
    return res.status(500).json({ message: "Error al actualizar dispositivo.", error: error.message });
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
  const { deviceId } = req.body;

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ message: "Se requiere el ID del dispositivo y debe ser un string." });
  }

  try {
    const dispositivoRef = db.collection("dispositivos").doc(deviceId);
    const dispositivoDoc = await dispositivoRef.get();

    if (!dispositivoDoc.exists) {
      return res.status(404).json({ message: "Dispositivo no encontrado." });
    }

    const dispositivoData = dispositivoDoc.data();

    // Validar que el usuario autenticado sea el propietario del dispositivo
    if (dispositivoData.usuario_id !== req.userId) {
      return res.status(403).json({ message: "No tienes permiso para generar un código para este dispositivo." });
    }

    let codigoInvitado;
    let codigoUnico = false;

    // Generar un código único de 6 dígitos
    while (!codigoUnico) {
      codigoInvitado = Math.floor(100000 + Math.random() * 900000).toString();

      // Verificar si el código ya existe en algún dispositivo
      const dispositivosSnapshot = await db
        .collection("dispositivos")
        .where("codigo_invitado", "==", codigoInvitado)
        .get();

      if (dispositivosSnapshot.empty) {
        codigoUnico = true;
      }
    }

    // Actualizar el campo `codigo_invitado` en el documento del dispositivo
    await dispositivoRef.update({ codigo_invitado: codigoInvitado });

    return res.status(200).json({
      message: "Código de invitado generado exitosamente.",
      codigo_invitado: codigoInvitado,
    });
  } catch (error) {
    console.error("Error al generar el código de invitado:", error.message);
    return res.status(500).json({
      message: "Error al generar el código de invitado.",
      error: error.message,
    });
  }
});



// Submit código invitado
router.post("/submitCodigoInvitado", authenticate, async (req, res) => {
  const { codigo_invitado } = req.body;

  if (!codigo_invitado || typeof codigo_invitado !== "string") {
    return res.status(400).json({ message: "Se requiere un código de invitado y debe ser un string." });
  }

  try {
    // Buscar el dispositivo por el código de invitado
    const dispositivoSnapshot = await db
      .collection("dispositivos")
      .where("codigo_invitado", "==", codigo_invitado)
      .get();

    if (dispositivoSnapshot.empty) {
      return res.status(404).json({ message: "Dispositivo no encontrado para el código de invitado proporcionado." });
    }

    const dispositivoDoc = dispositivoSnapshot.docs[0];
    const dispositivoData = dispositivoDoc.data();

    // Validar que el usuario no sea el propietario del dispositivo
    if (dispositivoData.usuario_id === req.userId) {
      return res.status(400).json({ message: "El propietario del dispositivo no puede agregarse como invitado." });
    }

    // Validar el plan asociado y la cantidad máxima de invitados permitidos
    const planId = dispositivoData.plan_id;
    if (!planId) {
      return res.status(400).json({ message: "El dispositivo no tiene un plan asociado." });
    }

    const planDoc = await db.collection("planes").doc(planId).get();
    if (!planDoc.exists) {
      return res.status(404).json({ message: "Plan asociado al dispositivo no encontrado." });
    }

    const planData = planDoc.data();
    const maxUsuariosInvitados = planData.cantidad_compartidos;

    // Verificar la cantidad actual de usuarios invitados
    const usuariosInvitados = dispositivoData.usuarios_invitados || [];
    if (usuariosInvitados.length >= maxUsuariosInvitados) {
      return res.status(403).json({ message: "El número máximo de usuarios invitados ha sido alcanzado." });
    }

    // Verificar que el usuario no esté ya en la lista de invitados
    if (usuariosInvitados.includes(req.userId)) {
      return res.status(400).json({ message: "El usuario ya está en la lista de invitados." });
    }

    // Agregar el usuario a la lista de usuarios invitados
    await dispositivoDoc.ref.update({
      usuarios_invitados: admin.firestore.FieldValue.arrayUnion(req.userId),
    });

    return res.status(200).json({
      message: "Usuario agregado a los invitados exitosamente.",
    });
  } catch (error) {
    console.error("Error al procesar el código de invitado:", error.message);
    return res.status(500).json({
      message: "Error al procesar el código de invitado.",
      error: error.message,
    });
  }
});




module.exports = router;
