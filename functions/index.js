const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa Firebase solo una vez
const serviceAccount = require('../GOOGLE_APPLICATION_CREDENTIALS.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Si estás utilizando una base de datos, descomenta la línea siguiente y proporciona la URL correcta
    // databaseURL: 'https://<tu-base-de-datos>.firebaseio.com',
});

// Importa las funciones de los módulos
const clientes = require('./funciones/clientes/index');
const planes = require('./funciones/planes/index');
const mercadopago = require('./funciones/mercadopago/index');
const dispositivos = require('./funciones/dispositivos/index');

// Exporta las funciones
exports.crearOrdenMercadoPago = mercadopago.crearOrdenMercadoPago;
exports.crearOrdenMercadoPago3 = mercadopago.crearOrdenMercadoPago3;
exports.getDispositivoByUsuario = dispositivos.getDispositivoByUsuario;

exports.obtenerPlanes = planes.obtenerPlanes;
exports.actualizarPlan = planes.actualizarPlan;
exports.eliminarPlan = planes.eliminarPlan;

exports.loginUser = clientes.loginUser;
exports.loginUserEmailPass = clientes.loginUserEmailPass;
exports.registerUser = clientes.registerUser;
exports.getProtectedResource = clientes.getProtectedResource;
