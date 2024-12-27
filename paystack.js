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

// Fetch Quiz Questions Endpoint
app.get("/quizzes", async (req, res) => {
    try {
        const quizSnapshot = await db.collection("quizzes").get();
        const quizzes = quizSnapshot.docs.map(doc => doc.data());

        res.json(quizzes);
    } catch (error) {
        console.error("Error fetching quizzes:", error.message);
        res.status(500).json({ success: false, message: "Error fetching quizzes." });
    }
});

// Function to upload quiz questions to Firestore
const uploadQuizzes = async () => {
    const quizQuestions = [
        // Partial quiz (3 questions)
        {
            question: "What is 2 + 2?",
            options: ["1", "2", "3", "4"],
            correctAnswer: "4",
            type: "partial",
        },
        {
            question: "What is the capital of France?",
            options: ["Berlin", "Madrid", "Paris", "Rome"],
            correctAnswer: "Paris",
            type: "partial",
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Earth", "Mars", "Jupiter", "Venus"],
            correctAnswer: "Mars",
            type: "partial",
        },
        // Full quiz (10 questions)
        {
            question: "What is the boiling point of water at sea level?",
            options: ["50°C", "100°C", "150°C", "200°C"],
            correctAnswer: "100°C",
            type: "full",
        },
        {
            question: "What is the square root of 16?",
            options: ["2", "4", "6", "8"],
            correctAnswer: "4",
            type: "full",
        },
        {
            question: "Who wrote 'Hamlet'?",
            options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
            correctAnswer: "William Shakespeare",
            type: "full",
        },
        {
            question: "What is the chemical symbol for gold?",
            options: ["Au", "Ag", "Pb", "Fe"],
            correctAnswer: "Au",
            type: "full",
        },
        {
            question: "What is the largest mammal?",
            options: ["Elephant", "Blue Whale", "Giraffe", "Rhino"],
            correctAnswer: "Blue Whale",
            type: "full",
        },
        {
            question: "How many continents are there?",
            options: ["5", "6", "7", "8"],
            correctAnswer: "7",
            type: "full",
        },
        {
            question: "Which gas is essential for respiration?",
            options: ["Nitrogen", "Carbon Dioxide", "Oxygen", "Hydrogen"],
            correctAnswer: "Oxygen",
            type: "full",
        },
        {
            question: "What is the main ingredient in sushi?",
            options: ["Bread", "Pasta", "Rice", "Noodles"],
            correctAnswer: "Rice",
            type: "full",
        },
        {
            question: "What is the smallest prime number?",
            options: ["0", "1", "2", "3"],
            correctAnswer: "2",
            type: "full",
        },
        {
            question: "What is the capital of Nigeria?",
            options: ["Lagos", "Abuja", "Kano", "Port Harcourt"],
            correctAnswer: "Abuja",
            type: "full",
        },
    ];

    try {
        const batch = db.batch();

        quizQuestions.forEach((quiz, index) => {
            const quizRef = db.collection("quizzes").doc(`quiz${index + 1}`);
            batch.set(quizRef, quiz);
        });

        await batch.commit();
        console.log("Quiz questions uploaded successfully!");
    } catch (error) {
        console.error("Error uploading quiz questions:", error);
    }
};

// Call this function when the server starts
uploadQuizzes();

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
