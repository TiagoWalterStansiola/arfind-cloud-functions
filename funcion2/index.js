const functions = require('firebase-functions');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const admin = require('firebase-admin');



// Configuración de las credenciales de acceso a Mercado Pago
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-2952799681043987-032414-caf1022a4fa67d3579049f715aa6afb3-1742313862' });

// Exporta la función de Firebase CHECKOUT Mercadopago estatico
exports.crearOrdenMercadoPago = functions.https.onRequest(async (req, res) => {
    try {
        // Crea la instancia de la preferencia
        const preference = new Preference(client);

        // Configura los parámetros para la preferencia
        const preferenceParams = {

            body: {
                back_urls: {
                    success: 'tuapp://retorno-pago?estado=exitoso',
                    failure: 'tuapp://retorno-pago?estado=fallo',
                    pending: 'tuapp://retorno-pago?estado=pendiente'
                },
                payment_methods: {
                    excluded_payment_methods: [
                        {
                            id: "amex"
                        },
                        {
                            id: "argencard"
                        },
                        {
                            id: "cabal"
                        },
                        {
                            id: "cmr"
                        },
                        {
                            id: "cencosud"
                        },
                        {
                            id: "cordobesa"
                        },
                        {
                            id: "diners"
                        },
                        {
                            id: "naranja"
                        },
                        {
                            id: "tarshop"
                        },
                        {
                            id: "debcabal"
                        },
                        {
                            id: "maestro"
                        }
                    ],
                    excluded_payment_types: [
                        {
                            id: "ticket"
                        }
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
                ],

            }
        };

        // Crea la preferencia en Mercado Pago
        const preferenceResponse = await preference.create(preferenceParams);

        console.log('Respuesta de la preferencia:', preferenceResponse);



        res.redirect(302, preferenceResponse.init_point);
    } catch (error) {
        console.error('Error al crear la orden de Mercado Pago:', error);
        res.status(500).send('Error interno del servidor');
    }
});
// Exporta la función de Firebase CHECKOUT Mercadopago dianmico, recibe los valores de la app (Android/IOS)
exports.crearOrdenMercadoPago3 = functions.https.onRequest(async (req, res) => {
    try {
        // Obtén los parámetros de la solicitud HTTP
        const { nombreProducto, descripcionProducto, imagenProducto, cantidad, precio } = req.body;

        // Crea la instancia de la preferencia
        const preference = new Preference(client);
        
        // Configura los parámetros para la preferencia
        const preferenceParams = {
            body: {
                back_urls: {
                    
                    success: 'tuapp://retorno-pago?estado=exitoso',
                    failure: 'tuapp://retorno-fallo?estado=fallo',
                    pending: 'tuapp://retorno-pendiente?estado=pendiente'
                },
                payment_methods: {
                    excluded_payment_methods: [
                        {
                            id: "amex"
                        },
                        {
                            id: "argencard"
                        },
                        {
                            id: "cabal"
                        },
                        {
                            id: "cmr"
                        },
                        {
                            id: "cencosud"
                        },
                        {
                            id: "cordobesa"
                        },
                        {
                            id: "diners"
                        },
                        {
                            id: "naranja"
                        },
                        {
                            id: "tarshop"
                        },
                        {
                            id: "debcabal"
                        },
                        {
                            id: "maestro"
                        }
                    ],
                    excluded_payment_types: [
                        {
                            id: "ticket"
                        }
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
                ],
                
            }
        };

        // Crea la preferencia en Mercado Pago
        const preferenceResponse = await preference.create(preferenceParams);

        console.log('Respuesta de la preferencia:', preferenceResponse);

        // Redirige al usuario al checkout de Mercado Pago

        res.status(200).json({ url: preferenceResponse.init_point });

        //res.redirect(302, preferenceResponse.init_point);
    } catch (error) {
        console.error('Error al crear la orden de Mercado Pago:', error);
        res.status(500).send('Error interno del servidor');
    }
});




  






