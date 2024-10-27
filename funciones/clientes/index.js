//CLIENTES
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.registerUser = functions.https.onRequest(async (req, res) => {
    const { email, password, displayName } = req.body;
  
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }
  
    try {
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: displayName,
      });
  
      // Opcional: puedes también generar un token de acceso para el usuario recién registrado
      const token = await admin.auth().createCustomToken(userRecord.uid);
  
      return res.status(201).send({ message: 'User registered successfully', token: token });
    } catch (error) {
      return res.status(500).send(`Error registering user: ${error.message}`);
    }
  });

  exports.loginUser = functions.https.onRequest(async (req, res) => {
    const { uid } = req.body;
  
    if (!uid) {
      return res.status(400).send('UID is required.');
    }
  
    try {
      // Crear un token personalizado
      const token = await admin.auth().createCustomToken(uid);
  
      return res.status(200).send({ token });
    } catch (error) {
      return res.status(500).send(`Error logging in user: ${error.message}`);
    }
  });


  exports.loginUserEmailPass = functions.https.onRequest(async (req, res) => {
    const { email, password } = req.body; // Obtén el email y la contraseña del cuerpo de la solicitud

    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    try {
        // Verifica las credenciales del usuario
        const userCredential = await admin.auth().getUserByEmail(email);
        
        // Si las credenciales son válidas, puedes generar un token personalizado
        const token = await admin.auth().createCustomToken(userCredential.uid);

        return res.status(200).send({ token });
    } catch (error) {
        return res.status(500).send(`Error logging in user: ${error.message}`);
    }
});




//----------------------------vemos donde lo ponemos desp----------------------------------------------------

  // Middleware para verificar si el usuario está autenticado
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
  
    if (!token) {
      return res.status(401).send('Unauthorized');
    }
  
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();  // Si la verificación es exitosa, se continúa con la ejecución
    } catch (error) {
      return res.status(401).send('Unauthorized');
    }
  };
//----------------------------enndpoint de prueba----------------------------------------------------

  // Ejemplo de Cloud Function protegida
  exports.getProtectedResource = functions.https.onRequest((req, res) => {
    authenticate(req, res, () => {
      // Si el usuario está autenticado, aquí puedes responder con los recursos.
      res.status(200).send(`Hola ${req.user.name}, tienes acceso a este recurso.`);
    });
  });




//----------prueba en Client

//  firebase.auth().currentUser.getIdToken(/* forceRefresh */ true).then((idToken) => {
//    // Enviar este token en el encabezado de autorización
//    fetch('https://<tu-cloud-function-url>', {
//      method: 'GET',
//      headers: {
//        'Authorization': `Bearer ${idToken}`
//      }
//    }).then(response => response.json())
//      .then(data => console.log(data))
//      .catch(error => console.error(error));
//  }).catch((error) => {
//    console.error('Error al obtener el token:', error);
//  });
  