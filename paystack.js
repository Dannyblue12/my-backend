  
const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-key.jso>
admin.initializeApp({
    credential: admin.credential.cert(serviceAccou>
});

const db = admin.firestore();

const app = express();
app.use(bodyParser.json());

// Enable CORS
app.use(cors());

// Add a root route
app.get("/", (req, res) => {
    res.send("Welcome to the Paystack Payment Back>
});
 
// Paystack Secret Key
const PAYSTACK_SECRET = "sk_test_e9e204942a7194499>

// Confirm Payment Endpoint
app.post("/confirm-payment", async (req, res) => {
    const { reference, email, deviceId } = req.bod>

    try {
        // Verify Payment with Paystack
        const response = await axios.get(`https://>
            headers: {
                Authorization: `Bearer ${PAYSTACK_>
            },
        });

        const paymentData = response.data.data;

        if (paymentData.status === "success") {
            // Save to Firestore
            const authCode = `AUTH-${Math.random()>
            await db.collection("payments").doc(de>
                email: email,
                deviceId: deviceId,
                amount: paymentData.amount,
              status: "success",
                authorizationCode: authCode,
                date: admin.firestore.Timestamp.no>
            });

            res.json({ success: true, authorizatio>
        } else {
            res.json({ success: false, message: "P>
        }
    } catch (error) {
        console.error("Error verifying payment:", >
        res.status(500).json({ success: false, mes>
    }
});

// Validate Authorization Code Endpoint
app.post("/validate-auth-code", async (req, res) =>
    const { deviceId, authCode } = req.body;

    try {
        const paymentDoc = await db.collection("pa>

        if (paymentDoc.exists) {
            const paymentData = paymentDoc.data();

            if (paymentData.authorizationCode === >
                res.json({ success: true, message:>
            } else {
                res.json({ success: false, message>
            }
        } else {
            res.json({ success: false, message: "N>
        }
    } catch (error) {
        console.error("Error validating authorizat>
        res.status(500).json({ success: false, mes>
    }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhos>
});
