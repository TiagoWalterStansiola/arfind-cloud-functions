const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa Firebase solo una vez
admin.initializeApp();

// Importa las funciones de los módulos
const clientes = require('./funciones/clientes/index');
const mercadopago = require('./funciones/mercadopago/index');

// Exporta las funciones
exports.funcionDePrueba = clientes.funcionDePrueba2;
exports.crearOrdenMercadoPago = mercadopago.crearOrdenMercadoPago;
exports.crearOrdenMercadoPago3 = mercadopago.crearOrdenMercadoPago3;


