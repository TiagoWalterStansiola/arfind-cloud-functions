const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa Firebase solo una vez
admin.initializeApp();

// Importa las funciones de los módulos
const funcion1 = require('./funcion1/index');
const funcion2 = require('./funcion2/index');

// Exporta las funciones
exports.funcionDePrueba = funcion1.funcionDePrueba;
exports.crearOrdenMercadoPago = funcion2.crearOrdenMercadoPago;
exports.crearOrdenMercadoPago3 = funcion2.crearOrdenMercadoPago3;


