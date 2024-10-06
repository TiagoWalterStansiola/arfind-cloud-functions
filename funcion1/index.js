const functions = require('firebase-functions');

// No es necesario volver a inicializar admin
exports.funcionDePrueba = functions.https.onRequest((req, res) => { 
    res.send("Hello from Firebase!");
});
