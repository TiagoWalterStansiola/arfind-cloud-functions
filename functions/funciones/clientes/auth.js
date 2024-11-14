const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });
        return res.status(201).json({ message: 'Usuario registrado con éxito', userId: userRecord.uid });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        return res.status(500).json({ message: 'Error al registrar el usuario', error: error.message });
    }
});

router.post('/registerUser', async (req, res) => {
    const { email, password, nombre, apellido, telefono, edad } = req.body;

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });

        const userId = userRecord.uid;
        const userDoc = {
            apellido,
            nombre,
            correo: email,
            fecha_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
            fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
            telefono,
            edad,
            id: userId
        };

        await admin.firestore().collection('usuarios').doc(userId).set(userDoc);

        return res.status(201).json({ message: 'Usuario registrado con éxito y agregado a Firestore', userId });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        return res.status(500).json({ message: 'Error al registrar el usuario', error: error.message });
    }
});

router.post('/sendCodeByMail', async (req, res) => {
    const { email,nombre } = req.body;

    try {
        // Generate random 6-digit PIN
        const pin = Math.floor(100000 + Math.random() * 900000);

        const pinUser ={
            email,
            pin
        }

        await admin.firestore().collection('pin_usuarios').doc().set(pinUser);

        const subject = 'Bienvenido a nuestra aplicación';
        const html = `
            <html>
                <div style="background-color:#e6e6e6;box-sizing:border-box;width:100%;height:100%;direction:ltr">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-collapse:separate;box-sizing:border-box;margin:0 auto;max-width:500px;min-width:320px" width="100%">
                        <thead>
                            <tr>
                                <td style="background-color:#f2f2f2;">
                                    <img src="https://firebasestorage.googleapis.com/v0/b/arfind.appspot.com/o/arfind_logo.png?alt=media&token=411af2c1-ba8e-4a50-a088-ea4352d34cb2" style="padding:34px 24px 0 24px;height:67px;max-height:67px" alt="ARFind">
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;font-style:normal;font-stretch:normal;line-height:1.41;letter-spacing:-0.4px;color:#2c2c31;padding:17px 24px 0">
                                    Bienvenid@ a ARFind
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:14px;font-weight:normal;font-style:normal;font-stretch:normal;line-height:1.43;letter-spacing:-0.3px;color:rgba(44,44,49,0.8);padding:10px 24px 0">
                                    <p style="color:#2c2c31;opacity:0.8;font-weight:100;margin:43px 0 0 0">
                                        Gracias por registrarte, ${nombre}. Introduce el siguiente código de verificación en la aplicación para continuar:
                                    </p>
                                     <h1 style="font-size:30px;color:black;">${pin}</h1>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </html>
        `;
        await sendEmail(email, subject, html);

        return res.status(201).json({ message: 'Envio de Mail exitoso'});
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        return res.status(500).json({ message: 'Error al registrar el usuario', error: error.message });
    }
});

/**
 * Sends an email to the specified destination.
 * @param {string} to - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 */
async function sendEmail(to, subject, html) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'arfindoficial@gmail.com',
            pass: 'bvozksgfhmhyzwwo',
        },
    });

    let mailOptions = {
        from: 'arfindoficial@gmail.com',
        to: to,
        subject: subject,
        html: html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo enviado correctamente!');
    } catch (error) {
        console.error('Error al enviar el correo:', error);
    }
}



router.get('/verifyPin', async (req, res) => {
    const { email, pin } = req.query;  // Get email and PIN from query parameters

    if (!email || !pin) {
        return res.status(400).json({ message: 'Email and PIN are required' });
    }

    try {
        // Verify the PIN by comparing it with the one stored in Firestore
        const isPinValid = await verifyPin(email, parseInt(pin));  // Convert pin to integer for comparison

        if (isPinValid) {
            return res.status(200).json({ message: 'PIN is valid',result: true });
        } else {
            return res.status(400).json({ message: 'Invalid PIN',result: false });
        }
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return res.status(500).json({ message: 'Error verifying PIN', error: error.message });
    }
});

// Function to verify the PIN for a given email
async function verifyPin(email, pinToVerify) {
    try {
        // Query Firestore for the user document with the given email
        const userDoc = await admin.firestore().collection('pin_usuarios')
            .where('email', '==', email)
            .get();

        if (userDoc.empty) {
            // No document found with this email
            return false;
        }

        // Get the first document (assuming the email is unique)
        const doc = userDoc.docs[0];
        const storedPin = doc.data().pin;

        // Check if the stored PIN matches the provided PIN
        return storedPin === pinToVerify;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;  // Error in verifying the PIN
    }
}

module.exports = router;
