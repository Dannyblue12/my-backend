const admin = require("firebase-admin")
const axios = require("axios")
require("dotenv").config()

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const GITHUB_OWNER = "Dannyblue12"
const GITHUB_REPO = "my-backend"
const GITHUB_BRANCH = "main"
const DIRECTORY = "quizfile"
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

async function fetchFileList() {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DIRECTORY}?ref=${GITHUB_BRANCH}`

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    return response.data.filter((file) => file.name.endsWith(".json"))
  } catch (error) {
    console.error("Error fetching file list from GitHub:", error.message)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
    throw error
  }
}

async function uploadQuizFile(fileUrl) {
  try {
    console.log(`Fetching quizzes from ${fileUrl}...`)
    const response = await axios.get(fileUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.raw",
      },
    })
    const quizzes = response.data

    for (const [subject, quizData] of Object.entries(quizzes)) {
      console.log(`Validating ${subject} quiz data...`)
      if (!validateQuizData(quizData)) {
        console.error(`Invalid quiz data for ${subject}. Skipping...`)
        continue
      }

      console.log(`Uploading ${subject} quiz to Firestore...`)
      await db.collection("quizzes").doc(subject).set(quizData)
      console.log(`Successfully uploaded ${subject} quiz`)
    }
  } catch (error) {
    console.error(`Error uploading quizzes from ${fileUrl}:`, error.message)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
  }
}

function validateQuizData(quizData) {
  if (!quizData.partialQuestions || !quizData.completeQuestions) {
    return false
  }

  const validateQuestions = (questions) => {
    return questions.every((q) => q.Q && q.A && q.B && q.C && q.D && q.Ans && q.explanation)
  }

  return validateQuestions(quizData.partialQuestions) && validateQuestions(quizData.completeQuestions)
}

async function uploadAllQuizzes() {
  try {
    const files = await fetchFileList()

    for (const file of files) {
      await uploadQuizFile(file.download_url)
    }

    console.log("All quizzes uploaded successfully.")
  } catch (error) {
    console.error("Error uploading quizzes:", error.message)
  }
}

uploadAllQuizzes()
  .then(() => {
    console.log("Quiz upload completed.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error during quiz upload process:", error.message)
    process.exit(1)
  })

          
