const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');


// Inicializa Firebase
admin.initializeApp();

// Inicializa la aplicación Express
const app = express();
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
const productosRoutes = require('./funciones/productos/index.js');
const authRoutes = require('./funciones/clientes/auth.js');
const clientesRoutes = require('./funciones/clientes/index.js');
const mercadopagoRoutes = require('./funciones/mercadopago/index.js');
const pedidosRoutes = require('./funciones/pedidos/index.js');
const notificacionesRoutes = require('./funciones/notificaciones/index.js');
const webhookMercadoRoutes = require('./funciones/mercadopago/webhook/index.js');
const simulacionRoutes = require('./funciones/simulacion_dispositivo/index.js');

/********************************
 *                              *
 *    IMPORTACION DE RUTAS      *                                                                     
 *                              *
 ********************************/
app.use('/planes', planesRoutes);
app.use('/empleados', empleadosRoutes);
app.use('/auth', authRoutes);
app.use('/dispositivos', dispositivosRoutes);
app.use('/productos', productosRoutes);
app.use('/clientes', clientesRoutes);
app.use('/mercadopago', mercadopagoRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/notificaciones', notificacionesRoutes);
app.use('/webhook', webhookMercadoRoutes);
app.use('/simulacion', simulacionRoutes);




// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).send('API en funcionamiento');
});

// Exporta la aplicación como una Cloud Function
exports.arfindFranco = functions.https.onRequest(app);
