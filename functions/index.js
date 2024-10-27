
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

// Importa funciones del módulo planes
//const planesRoutes = require('./planes/index');
//
//const pedidosRoutes = require('./planes/index');
//
//// Usar las rutas de planes
//app.use('/planes', planesRoutes);
//
//app.use('/pedidos', pedidosRoutes);

// Ruta para la raíz
app.get('/', (req, res) => {
    res.status(200).send('API en funcionamiento');
});

// Exporta la función como un endpoint de Cloud Function
exports.arfind = functions.https.onRequest(app);



