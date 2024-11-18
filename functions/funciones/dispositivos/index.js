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
    // Crear la referencia al usuario en Firestore
    const usuarioRef = db.collection("usuarios").doc(usuarioId);

    // Realiza la consulta con la referencia al usuario
    const dispositivoSnapshot = await db
      .collection("dispositivos")
      .where("usuario_id", "==", usuarioRef) // Compara contra la referencia al usuario
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
    // Construir la referencia al producto
    const tipoProductoRef = db.collection('productos').doc(tipo_producto);

    // Verificar si el producto existe antes de asociarlo
    const tipoProductoDoc = await tipoProductoRef.get();
    if (!tipoProductoDoc.exists) {
      return res.status(404).json({ message: 'El tipo de producto proporcionado no existe.' });
    }

    // Obtener el título del producto para asignarlo como apodo
    const tipoProductoData = tipoProductoDoc.data();
    const apodo = tipoProductoData.titulo || "Producto sin título"; // Usar el título o un valor predeterminado

    const newDevice = {
      numero_telefonico,
      tipo_producto: tipoProductoRef, // Guardar como referencia
      apodo, // Asignar apodo basado en el título del tipo_producto
      bateria: null, // Valor inicial
      codigo_invitado: "", // Campo vacío
      fecha_creacion: admin.firestore.Timestamp.now(), // Fecha de creación actual
      plan_id: null, // Inicialmente sin plan asociado
      ubicacion: null, // Inicialmente sin ubicación
      ult_actualizacion: admin.firestore.Timestamp.now(), // Fecha de actualización actual
      usuario_id: null, // Inicialmente sin usuario asociado
      usuarios_invitados: [], // Lista vacía de usuarios invitados
    };

    // Guardar el dispositivo en Firestore
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

    const dispositivoData = dispositivoDoc.data();
    const updatedFields = {};

    // Validar y agregar usuario_id
    if (updatedData.usuario_id) {
      const usuarioRef = db.collection('usuarios').doc(updatedData.usuario_id);
      const usuarioDoc = await usuarioRef.get();
      if (!usuarioDoc.exists) {
        return res.status(400).json({ message: 'El usuario_id proporcionado no existe.' });
      }
      updatedFields.usuario_id = usuarioRef;
    }

    // Validar y agregar plan_id
    if (updatedData.plan_id) {
      const planRef = db.collection('planes').doc(updatedData.plan_id);
      const planDoc = await planRef.get();
      if (!planDoc.exists) {
        return res.status(400).json({ message: 'El plan_id proporcionado no existe.' });
      }
      updatedFields.plan_id = planRef;
    }

    // Validar y agregar tipo_producto
    if (updatedData.tipo_producto) {
      const productoRef = db.collection('productos').doc(updatedData.tipo_producto);
      const productoDoc = await productoRef.get();
      if (!productoDoc.exists) {
        return res.status(400).json({ message: 'El tipo_producto proporcionado no existe.' });
      }
      updatedFields.tipo_producto = productoRef;
    }

    // Validar usuarios_invitados
    if (updatedData.usuarios_invitados) {
      const invitadosSet = new Set();
      const invitadosValidos = [];

      // Verificar el plan actual del dispositivo
      const planId = dispositivoData.plan_id?.id || updatedData.plan_id;
      if (!planId) {
        return res.status(400).json({ message: 'El dispositivo debe tener un plan asociado para validar los invitados.' });
      }

      const planRef = db.collection('planes').doc(planId);
      const planDoc = await planRef.get();
      if (!planDoc.exists) {
        return res.status(400).json({ message: 'El plan asociado no existe.' });
      }

      const cantidadMaxInvitados = planDoc.data().cantidad_compartidos || 0;

      // Validar cada invitado
      for (const uid of updatedData.usuarios_invitados) {
        if (uid === updatedData.usuario_id) {
          return res.status(400).json({ message: 'El usuario propietario no puede ser invitado.' });
        }

        if (invitadosSet.has(uid)) {
          return res.status(400).json({ message: `El usuario invitado con ID ${uid} está repetido.` });
        }

        const usuarioRef = db.collection('usuarios').doc(uid);
        const usuarioDoc = await usuarioRef.get();
        if (!usuarioDoc.exists) {
          return res.status(400).json({ message: `El usuario invitado con ID ${uid} no existe.` });
        }

        invitadosSet.add(uid);
        invitadosValidos.push(usuarioRef);

        // Validar el número máximo de invitados
        if (invitadosValidos.length > cantidadMaxInvitados) {
          return res.status(400).json({ 
            message: `El número máximo de usuarios invitados permitidos para este plan es ${cantidadMaxInvitados}.`
          });
        }
      }

      updatedFields.usuarios_invitados = invitadosValidos;
    }

    // Validar y agregar ubicación
    if (updatedData.ubicacion) {
      const { latitude, longitude } = updatedData.ubicacion;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ message: 'La ubicación debe contener latitude y longitude como números.' });
      }
      updatedFields.ubicacion = new admin.firestore.GeoPoint(latitude, longitude);
    }

    // Validar y agregar apodo
    if (updatedData.apodo) {
      if (typeof updatedData.apodo !== 'string' || updatedData.apodo.trim() === '') {
        return res.status(400).json({ message: 'El apodo debe ser un string no vacío.' });
      }
      updatedFields.apodo = updatedData.apodo.trim();
    }

    // Validar y agregar código invitado
    if (updatedData.codigo_invitado) {
      if (typeof updatedData.codigo_invitado !== 'string' || updatedData.codigo_invitado.trim() === '') {
        return res.status(400).json({ message: 'El código invitado debe ser un string no vacío.' });
      }
      updatedFields.codigo_invitado = updatedData.codigo_invitado.trim();
    }

    // Actualizar el campo de última actualización
    updatedFields.ult_actualizacion = admin.firestore.Timestamp.now();

    // Verificar que al menos un campo esté presente para actualizar
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar' });
    }

    // Actualizar el documento del dispositivo en Firestore
    await dispositivoRef.update(updatedFields);

    return res.status(200).send({ message: 'Dispositivo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar dispositivo:', error);
    return res.status(500).send({ message: 'Error al actualizar dispositivo', error: error.message });
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

    const dispositivoData = dispositivoDoc.data();

    // Validar que el usuario autenticado sea el propietario del dispositivo
    if (!dispositivoData.usuario_id || dispositivoData.usuario_id.path !== `usuarios/${req.userId}`) {
      return res.status(403).json({ message: 'No tienes permiso para generar un código para este dispositivo.' });
    }

    let codigoInvitado;
    let codigoUnico = false;

    // Generar y verificar un código único
    while (!codigoUnico) {
      codigoInvitado = Math.floor(100000 + Math.random() * 900000).toString(); // Generar un código de 6 dígitos

      // Comprobar si ya existe el código en otro dispositivo
      const dispositivosSnapshot = await db.collection('dispositivos')
        .where('codigo_invitado', '==', codigoInvitado)
        .get();

      if (dispositivosSnapshot.empty) {
        codigoUnico = true; // El código es único
      }
    }

    // Actualizar el campo codigo_invitado en el documento del dispositivo
    await dispositivoRef.update({ codigo_invitado: codigoInvitado });

    return res.status(200).json({ 
      message: 'Código de invitado generado exitosamente', 
      codigo_invitado: codigoInvitado 
    });
  } catch (error) {
    console.error('Error al generar el código de invitado:', error);
    return res.status(500).json({ 
      message: 'Error al generar el código de invitado', 
      error: error.message 
    });
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

    // Validar que el usuario que envía la solicitud no sea el dueño del dispositivo
    if (dispositivoData.usuario_id && dispositivoData.usuario_id.id === `usuarios/${req.userId}`) {
      return res.status(400).json({ message: 'El propietario del dispositivo no puede agregarse como invitado.' });
    }

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
      return res.status(403).json({ message: 'El número máximo de usuarios invitados ha sido alcanzado.' });
    }

    // Verificar si el usuario ya está en la lista de usuarios invitados
    const userId = req.userId; // Obtener el userId del middleware
    if (usuarios_invitados.some(inv => inv.id === `usuarios/${userId}`)) {
      return res.status(400).json({ message: 'El usuario ya está en la lista de usuarios invitados.' });
    }

    // Agregar el usuario a la lista de usuarios invitados
    await dispositivosRef.doc(dispositivoDoc.id).update({
      usuarios_invitados: admin.firestore.FieldValue.arrayUnion(db.doc(`usuarios/${userId}`)) // Agregar el userId como referencia
    });

    return res.status(200).json({ message: 'Usuario agregado a los invitados exitosamente' });
  } catch (error) {
    console.error('Error al procesar el código invitado:', error);
    return res.status(500).json({ message: 'Error al procesar el código invitado', error: error.message });
  }
});



module.exports = router;
