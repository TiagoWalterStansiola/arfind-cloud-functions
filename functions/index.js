
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Inicializa Firebase
admin.initializeApp();

// Inicializa la aplicación Express
const app = express();

// Configura CORS
app.use(cors({ origin: true }));
app.use(express.json());



/********************************
 *                              *
 *    IMPORTACION DE MODULOS    *                                                                     
 *                              *
 ********************************/
const planesRoutes = require('./funciones/planes/index.js');
const empleadosRoutes = require('./funciones/empleados/index.js');
const dispositivosRoutes = require('./funciones/dispositivos/index.js');


/********************************
 *                              *
 *    IMPORTACION DE RUTAS      *                                                                     
 *                              *
 ********************************/
app.use('/planes', planesRoutes);
app.use('/empleados', empleadosRoutes);
app.use('/dispositivos', dispositivosRoutes);



// Ruta para la raíz
app.get('/', (req, res) => {
    res.status(200).send('API en funcionamiento');
});

// Exporta la función como un endpoint de Cloud Function
exports.arfind = functions.https.onRequest(app);



