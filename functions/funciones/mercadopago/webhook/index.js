const express = require('express');
const axios = require('axios');
const { WEBHOOK_SECRET, MERCADO_PAGO_ACCESS_TOKEN } = require('../../../config');
const router = express.Router();

// Configuración del Webhook
router.post('/generarPedido', async (req, res) => {
    try {
        const paymentId = req.body.data?.id;

        if (!paymentId) {
            return res.status(400).json({ message: 'ID de pago no proporcionado en el webhook.' });
        }

        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
            }
        });

        const payment = response.data;

        if (payment.status === 'approved') {
            console.log('Pago aprobado:', payment);

            const { pedidoId, idProducto, userId } = JSON.parse(payment.external_reference);

            if (!userId) {
                console.error('Error: userId no proporcionado.');
                return res.status(400).json({ message: 'Usuario no identificado' });
            }

            const pedidoData = {
                items: [
                    { id_producto: idProducto, plan_id: 'plan1' }
                ],
                direccion: 'Corrientes 2037',
                userId // Pasar el userId al endpoint de creación de pedidos
            };

            const pedidoResponse = await axios.post(
                'https://arfindfranco-t22ijacwda-uc.a.run.app/pedidos/createPedido',
                pedidoData,
                {
                    headers: {
                        'x-webhook-key': WEBHOOK_SECRET
                    }
                }
            );

            console.log('Pedido creado:', pedidoResponse.data);
        } else {
            console.log('Estado del pago no aprobado:', payment.status);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error al procesar el webhook:', error);
        res.status(500).json({ message: 'Error al procesar el webhook', error: error.message });
    }
});









module.exports = router;
