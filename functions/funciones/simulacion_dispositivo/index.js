const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const db = admin.firestore();

// Simulación de movimiento de dispositivo
const DISPOSITIVO_ID = 'Q8UZeVdgiJQDpGuxm2gk';
const rutaPuertoMadero = [
  { latitude: -34.6081, longitude: -58.3681 },
  { latitude: -34.6076, longitude: -58.3674 },
  { latitude: -34.6071, longitude: -58.3667 },
  { latitude: -34.6066, longitude: -58.3658 },
  { latitude: -34.6061, longitude: -58.3651 },
  { latitude: -34.6056, longitude: -58.3644 },
  { latitude: -34.6050, longitude: -58.3637 },
  { latitude: -34.6045, longitude: -58.3630 },
];

let currentStep = 0;

// Función para actualizar la ubicación del dispositivo
const actualizarUbicacionDispositivo = async () => {
  try {
    const nuevaUbicacion = rutaPuertoMadero[currentStep];
    await db.collection('dispositivos').doc(DISPOSITIVO_ID).update({
      ubicacion: new admin.firestore.GeoPoint(nuevaUbicacion.latitude, nuevaUbicacion.longitude),
      ult_actualizacion: admin.firestore.Timestamp.now(),
    });

    console.log(`Ubicación actualizada: ${nuevaUbicacion.latitude}, ${nuevaUbicacion.longitude}`);

    currentStep = (currentStep + 1) % rutaPuertoMadero.length;
    return { success: true, message: 'Ubicación actualizada.' };
  } catch (error) {
    console.error('Error al actualizar la ubicación:', error.message);
    return { success: false, message: error.message };
  }
};

// Ruta POST para iniciar una actualización de ubicación
router.post('/actualizarUbicacion', async (req, res) => {
  try {
    const result = await actualizarUbicacionDispositivo();
    if (result.success) {
      return res.status(200).json({ message: 'Ubicación actualizada con éxito.' });
    } else {
      return res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error en la ruta de actualización:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
