const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for cross-origin requests

// Add a root route
app.get("/", (req, res) => {
    res.send("Welcome to the Paystack Payment Backend!");
});

// Paystack Secret Key
const PAYSTACK_SECRET = "sk_test_e9e204942a71944991c42534ede108fd6594ca45"; // Replace with your Paystack secret key

// Confirm Payment Endpoint
app.post("/confirm-payment", async (req, res) => {
    const { reference, email, deviceId } = req.body;

    try {
        // Verify Payment with Paystack
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
            },
        });

        const paymentData = response.data.data;

        if (paymentData.status === "success") {
            // Generate a unique authorization code
            const authCode = `AUTH-${Math.random().toString(36).substr(2, 8)}`;

            // Save to Firestore
            await db.collection("payments").doc(deviceId).set({
                email: email,
                deviceId: deviceId,
                amount: paymentData.amount,
                status: "success",
                authorizationCode: authCode,
                date: admin.firestore.Timestamp.now(),
            });

            // Send success response with the authorization code
            res.json({ success: true, authorizationCode: authCode });
        } else {
            res.status(400).json({ success: false, message: "Payment not successful." });
        }
    } catch (error) {
        console.error("Error verifying payment:", error.message);
        res.status(500).json({ success: false, message: "Error verifying payment." });
    }
});

// Validate Authorization Code Endpoint
app.post("/validate-auth-code", async (req, res) => {
    const { deviceId, authCode } = req.body;

    try {
        const paymentDoc = await db.collection("payments").doc(deviceId).get();

        if (paymentDoc.exists) {
            const paymentData = paymentDoc.data();

            if (paymentData.authorizationCode === authCode) {
                res.json({ success: true, message: "Authorization code is valid." });
            } else {
                res.json({ success: false, message: "Invalid authorization code." });
            }
        } else {
            res.json({ success: false, message: "No payment record found for this device." });
        }
    } catch (error) {
        console.error("Error validating authorization code:", error.message);
        res.status(500).json({ success: false, message: "Error validating authorization code." });
    }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
