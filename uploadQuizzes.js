const admin = require('firebase-admin');
const axios = require('axios');

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const GITHUB_QUIZZES_URL = 'https://raw.githubusercontent.com/Dannyblue12/my-backend/main/Bio101.json';

// Function to fetch quizzes from GitHub and upload to Firestore
async function uploadQuizzes() {
    try {
        console.log('Fetching quizzes from GitHub...');
        const response = await axios.get(GITHUB_QUIZZES_URL);
        const quizzes = response.data;

        for (const [subject, quizData] of Object.entries(quizzes)) {
            console.log(`Uploading ${subject} quizzes to Firestore...`);
            await db.collection('quizzes').doc(subject).set(quizData);
            console.log(`Successfully uploaded ${subject} quiz`);
        }

        console.log('All quizzes uploaded successfully.');
    } catch (error) {
        console.error('Error uploading quizzes:', error.message);
    }
}

// Run the upload
uploadQuizzes().then(() => {
    console.log('Quizzes upload completed.');
    process.exit(0); // Exit the script
}).catch((error) => {
    console.error('Error in quiz upload:', error.message);
    process.exit(1); // Exit with error
});
