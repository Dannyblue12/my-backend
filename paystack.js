const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
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

// Fetch quizzes (based on successful payment verification)
app.get("/quizzes", async (req, res) => {
    const { deviceId, authCode } = req.query; // Get the deviceId and authCode from the query params

    try {
        // Fetch the payment document using deviceId
        const paymentDoc = await db.collection("payments").doc(deviceId).get();

        if (!paymentDoc.exists) {
            return res.status(400).json({ success: false, message: "No payment record found." });
        }

        const paymentData = paymentDoc.data();

        // Check if the authorization code is valid
        if (paymentData.authorizationCode === authCode && paymentData.status === "success") {
            // Authorized user - fetch full quiz
            const quizSnapshot = await db.collection("quizzes").where("type", "==", "full").get();
            const quizzes = quizSnapshot.docs.map(doc => doc.data());
            return res.json(quizzes); // Send the full quizzes
        } else {
            // Unauthorized user - fetch partial quiz
            const quizSnapshot = await db.collection("quizzes").where("type", "==", "partial").get();
            const quizzes = quizSnapshot.docs.map(doc => doc.data());
            return res.json(quizzes); // Send the partial quizzes
        }
    } catch (error) {
        console.error("Error fetching quizzes:", error.message);
        res.status(500).json({ success: false, message: "Error fetching quizzes." });
    }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
