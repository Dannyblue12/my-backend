const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-key.json"); // Fix the file extension
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
app.use(bodyParser.json());

// Enable CORS
app.use(cors());

// Add a root route
app.get("/", (req, res) => {
    res.send("Welcome to the Paystack Payment Backend!");
});

// Paystack Secret Key
const PAYSTACK_SECRET = "sk_test_e9e204942a7194499"; // Add the closing quote here

// Confirm Payment Endpoint
app.post("/confirm-payment", async (req, res) => {
    const { reference, email, deviceId } = req.body;

    if (!reference || !email || !deviceId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // Verify Payment with Paystack
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
            },
        });

        const paymentData = response.data.data;

        if (paymentData.status === "success") {
            // Save to Firestore
            const authCode = `AUTH-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
            await db.collection("payments").doc(deviceId).set({
                email: email,
                deviceId: deviceId,
                amount: paymentData.amount,
                status: "success",
                authorizationCode: authCode,
                date: admin.firestore.Timestamp.now(),
            });

            return res.json({ success: true, authorizationCode: authCode });
        } else {
            return res.status(400).json({ success: false, message: "Payment failed" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error.message);
        return res.status(500).json({ success: false, message: "Server error during payment verification" });
    }
});
// Validate Authorization Code Endpoint
app.post("/validate-auth-code", async (req, res) => {
    const { deviceId, authCode } = req.body;

    try {
        const paymentDoc = await db.collection("payments").doc(deviceId).get(); // Access document correctly

        if (paymentDoc.exists) {
            const paymentData = paymentDoc.data();

            if (paymentData.authorizationCode === authCode) {
                res.json({ success: true, message: "Authorization code valid" });
            } else {
                res.json({ success: false, message: "Invalid authorization code" });
            }
        } else {
            res.json({ success: false, message: "No payment found for this device" });
        }
    } catch (error) {
        console.error("Error validating authorization code:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Start Server
const PORT = process.env.PORT || 3000; // Use environment variable for port
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
