const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa Firebase solo una vez
admin.initializeApp();

// Importa las funciones de los módulos
const funcion1 = require('./funciones/usuarios/index');
const mercadopago = require('./funciones/mercadopago/index');

// Exporta las funciones
exports.funcionDePrueba = funcion1.funcionDePrueba;
exports.crearOrdenMercadoPago = mercadopago.crearOrdenMercadoPago;
exports.crearOrdenMercadoPago3 = mercadopago.crearOrdenMercadoPago3;


