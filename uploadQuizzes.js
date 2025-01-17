const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config(); // Ensure environment variables are loaded

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// GitHub Repository Details
const GITHUB_OWNER = "Dannyblue12"; // Replace with your GitHub username
const GITHUB_REPO = "my-backend";   // Replace with your GitHub repository name
const GITHUB_BRANCH = "main";       // Replace with your branch name
const DIRECTORY = "quizfile";       // Folder containing quiz files
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal access token for GitHub API

// Function to fetch file list from GitHub
async function fetchFileList() {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DIRECTORY}?ref=${GITHUB_BRANCH}`;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
            },
        });

        // Return only .json files
        return response.data.filter((file) => file.name.endsWith(".json"));
    } catch (error) {
        console.error("Error fetching file list from GitHub:", error.message);
        throw error;
    }
}

// Function to fetch and upload quizzes from a file
async function uploadQuizFile(fileUrl) {
    try {
        console.log(`Fetching quizzes from ${fileUrl}...`);
        const response = await axios.get(fileUrl);
        const quizzes = response.data;

        for (const [subject, quizData] of Object.entries(quizzes)) {
            console.log(`Uploading ${subject} quiz to Firestore...`);
            await db.collection("quizzes").doc(subject).set(quizData);
            console.log(`Successfully uploaded ${subject} quiz`);
        }
    } catch (error) {
        console.error(`Error uploading quizzes from ${fileUrl}:`, error.message);
    }
}

// Function to process all files in the directory
async function uploadAllQuizzes() {
    try {
        const files = await fetchFileList();

        for (const file of files) {
            await uploadQuizFile(file.download_url);
        }

        console.log("All quizzes uploaded successfully.");
    } catch (error) {
        console.error("Error uploading quizzes:", error.message);
    }
}

// Run the upload process
uploadAllQuizzes()
    .then(() => {
        console.log("Quiz upload completed.");
        process.exit(0); // Exit the script
    })
    .catch((error) => {
        console.error("Error during quiz upload process:", error.message);
        process.exit(1); // Exit with error
    });
