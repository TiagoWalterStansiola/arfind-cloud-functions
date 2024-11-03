// funciones/mercadoPago/mercadoPagoRoutes.js
const functions = require('firebase-functions');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const admin = require('firebase-admin');
const express = require('express');

// Configuración de las credenciales de acceso a Mercado Pago
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-7557743885047413-110316-06069ee599fb83bfed6452ad09a1e0a5-2076128946' });

// Inicializa el enrutador de Express
const router = express.Router();

// Ruta para crear una orden de Mercado Pago estática
router.post('/crearOrdenEstatica', async (req, res) => {
    try {
        const preference = new Preference(client);
        const preferenceParams = {
            body: {
                back_urls: {
                    success: 'tuapp://retorno-pago?estado=exitoso',
                    failure: 'tuapp://retorno-pago?estado=fallo',
                    pending: 'tuapp://retorno-pago?estado=pendiente'
                },
                payment_methods: {
                    excluded_payment_methods: [
                        { id: "amex" },
                        { id: "argencard" },
                        { id: "cabal" },
                        { id: "cmr" },
                        { id: "cencosud" },
                        { id: "cordobesa" },
                        { id: "diners" },
                        { id: "naranja" },
                        { id: "tarshop" },
                        { id: "debcabal" },
                        { id: "maestro" }
                    ],
                    excluded_payment_types: [
                        { id: "ticket" }
                    ],
                    installments: 1
                },
                items: [
                    {
                        title: 'Mi producto',
                        description: 'Descripción de mi producto',
                        picture_url: 'https://firebasestorage.googleapis.com/v0/b/kiddo-1a959.appspot.com/o/Melvin.png?alt=media&token=b22dff94-0e1f-473e-b851-9f69c8969fa2',
                        category_id: 'car_electronics',
                        quantity: 2,
                        currency_id: 'ARS',
                        unit_price: 1
                    },
                    {
                        title: 'Mi producto 2',
                        description: 'Descripción de mi producto',
                        picture_url: 'https://firebasestorage.googleapis.com/v0/b/kiddo-1a959.appspot.com/o/Melvin.png?alt=media&token=b22dff94-0e1f-473e-b851-9f69c8969fa2',
                        category_id: 'car_electronics',
                        quantity: 1,
                        currency_id: 'ARS',
                        unit_price: 2
                    }
                ]
            }
        };
        const preferenceResponse = await preference.create(preferenceParams);
        res.redirect(302, preferenceResponse.init_point);
    } catch (error) {
        console.error('Error al crear la orden de Mercado Pago:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Ruta para crear una orden de Mercado Pago dinámica
router.post('/crearOrdenDinamica', async (req, res) => {
    try {
        const { nombreProducto, descripcionProducto, imagenProducto, cantidad, precio } = req.body;
        const preference = new Preference(client);
        const preferenceParams = {
            body: {
                back_urls: {
                    success: 'tuapp://retorno-pago?estado=exitoso',
                    failure: 'tuapp://retorno-fallo?estado=fallo',
                    pending: 'tuapp://retorno-pendiente?estado=pendiente'
                },
                payment_methods: {
                    excluded_payment_methods: [
                        { id: "amex" },
                        { id: "argencard" },
                        { id: "cabal" },
                        { id: "cmr" },
                        { id: "cencosud" },
                        { id: "cordobesa" },
                        { id: "diners" },
                        { id: "naranja" },
                        { id: "tarshop" },
                        { id: "debcabal" },
                        { id: "maestro" }
                    ],
                    excluded_payment_types: [
                        { id: "ticket" }
                    ],
                    installments: 1
                },
                items: [
                    {
                        title: nombreProducto,
                        description: descripcionProducto,
                        picture_url: imagenProducto,
                        quantity: cantidad,
                        currency_id: 'ARS',
                        unit_price: precio
                    }
                ]
            }
        };
        const preferenceResponse = await preference.create(preferenceParams);
        res.status(200).json({ url: preferenceResponse.init_point });
    } catch (error) {
        console.error('Error al crear la orden de Mercado Pago:', error);
        res.status(500).send('Error interno del servidor');
    }
});

module.exports = router;
