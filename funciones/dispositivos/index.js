//DISPOSITIVOS

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();


exports.getDispositivoByUsuario = functions.https.onRequest(async (req, res) => {
    const token = req.headers.authorization?.split("Bearer ")[1];
  
    if (!token) {
      return res.status(403).send("El token es requerido.");
    }
  
    try {
      // Verificar el token con Firebase Authentication
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("Token verificado, uid del usuario:", decodedToken.uid);
  
      const usuario = req.query.usuario;
  
      if (!usuario) {
        return res.status(400).send("El parámetro 'usuario' es requerido.");
      }
  
      // Consulta para buscar el documento donde el campo 'usuario' coincida con el valor pasado
      const dispositivoSnapshot = await db.collection('dispositivos').where('usuario', '==', usuario).get();
  
      if (dispositivoSnapshot.empty) {
        return res.status(404).send("Dispositivo no encontrado.");
      }
  
      // Devolver el primer documento
      const dispositivoData = dispositivoSnapshot.docs[0].data();
      return res.status(200).json(dispositivoData);
    } catch (error) {
      if (error.code === 'auth/argument-error') {
        return res.status(403).send("Token inválido.");
      }
      console.error("Error al obtener el dispositivo: ", error);
      return res.status(500).send("Error al obtener el dispositivo.");
    }
  });
  
  