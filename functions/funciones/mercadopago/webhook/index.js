const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
const { WEBHOOK_SECRET, MERCADO_PAGO_ACCESS_TOKEN } = require('../../../config');
const router = express.Router();

// Configuración del Webhook
router.post('/generarPedido', async (req, res) => {
    const topic = req.query.topic; // Obtener el tipo de notificación
    console.log(`Webhook recibido con topic: ${topic}`); // Log del tipo de notificación

    if (topic !== 'payment') {
        console.log(`Notificación ignorada, topic: ${topic}`);
        return res.status(200).send('Notificación no relevante');
    }

    // Intenta obtener el paymentId desde diferentes lugares
    let paymentId = req.body.data?.id || req.query.id; // Verifica si está en el cuerpo o en el query
    console.log(`paymentId recibido: ${paymentId}`); // Log del ID del pago recibido

    if (!paymentId) {
        console.error('No se recibió un paymentId válido en el webhook.');
        console.log('Contenido del cuerpo de la notificación:', req.body); // Log del cuerpo completo
        return res.status(400).json({ message: 'ID de pago no proporcionado en el webhook.' });
    }

    // Responder inmediatamente para evitar reintentos
    res.status(200).send('OK');

    try {
        const db = admin.firestore();
        const transaccionRef = db.collection('transacciones_procesadas').doc(paymentId);

        const procesado = await db.runTransaction(async (transaction) => {
            const transaccionSnapshot = await transaction.get(transaccionRef);
            if (transaccionSnapshot.exists) {
                console.log(`El pago con ID ${paymentId} ya fue procesado.`);
                return true;
            }

            // Registrar la transacción como procesada
            transaction.set(transaccionRef, { procesado: true, fecha: admin.firestore.FieldValue.serverTimestamp() });
            return false;
        });

        if (procesado) {
            return; // Detener aquí si ya fue procesado
        }

        // Procesar el pago
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` },
        });

        console.log('Respuesta de Mercado Pago:', response.data); // Log del pago recibido

        const payment = response.data;

        if (payment.status === 'approved') {
            const { idProducto, idPlan, userId } = JSON.parse(payment.external_reference);
            console.log('Datos del external_reference:', { idProducto, idPlan, userId }); // Log de los datos del pedido

            await axios.post(
                'https://arfindfranco-t22ijacwda-uc.a.run.app/pedidos/createPedido',
                {
                    items: [{ id_producto: idProducto, plan_id: idPlan }],
                    direccion: 'Corrientes 2037',
                    userId,
                },
                { headers: { 'x-webhook-key': WEBHOOK_SECRET } }
            );

            console.log('Pedido creado exitosamente para paymentId:', paymentId);
        } else {
            console.error(`El estado del pago no es aprobado: ${payment.status}`);
        }
    } catch (error) {
        console.error('Error al procesar el webhook:', error.response?.data || error.message);
    }
});


















module.exports = router;
