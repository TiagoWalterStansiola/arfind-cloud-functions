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

            const { idProducto, idPlan, userId } = JSON.parse(payment.external_reference);

            if (!idProducto || !idPlan || !userId) {
                console.error('Datos incompletos en la referencia externa:', { idProducto, idPlan, userId });
                return res.status(400).json({ message: 'Datos incompletos para procesar el pedido.' });
            }

            console.log('Enviando datos al endpoint de pedidos:', {
                items: [{ id_producto: idProducto, plan_id: idPlan }],
                direccion: 'Corrientes 2037',
                userId
            });

            const pedidoResponse = await axios.post(
                'https://arfindfranco-t22ijacwda-uc.a.run.app/pedidos/createPedido',
                {
                    items: [{ id_producto: idProducto, plan_id: idPlan }],
                    direccion: 'Corrientes 2037',
                    userId
                },
                {
                    headers: {
                        'x-webhook-key': WEBHOOK_SECRET
                    }
                }
            );

            console.log('Pedido creado exitosamente:', pedidoResponse.data);
        } else {
            console.log('Estado del pago no aprobado:', payment.status);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error al procesar el webhook:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error al procesar el webhook', error: error.message });
    }
});












module.exports = router;
