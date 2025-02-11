const admin = require("firebase-admin")
const fs = require("fs")
require("dotenv").config()

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function uploadQuizFile(filePath) {
  try {
    console.log(`Reading quiz data from ${filePath}...`)
    const fileContent = fs.readFileSync(filePath, "utf8")
    const quizData = JSON.parse(fileContent)

    for (const [subject, subjectData] of Object.entries(quizData)) {
      console.log(`Validating ${subject} quiz data...`)
      if (!validateQuizData(subjectData)) {
        console.error(`Invalid quiz data for ${subject}. Skipping...`)
        continue
      }

      console.log(`Uploading ${subject} quiz to Firestore...`)

      // Ensure the data is a plain JavaScript object
      const plainObject = JSON.parse(JSON.stringify(subjectData))

      // Log the structure of the data being sent to Firestore
      console.log(`Data structure for ${subject}:`, JSON.stringify(plainObject, null, 2))

      // Upload the quiz data to Firestore
      await db.collection("quizzes").doc(subject).set(plainObject)
      console.log(`Successfully uploaded ${subject} quiz`)
    }
  } catch (error) {
    console.error(`Error uploading quiz from ${filePath}:`, error.message)
    throw error
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

async function uploadQuiz() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("Please provide the path to the JSON file as an argument.")
    process.exit(1)
  }

  try {
    await uploadQuizFile(filePath)
    console.log("Quiz upload completed.")
    process.exit(0)
  } catch (error) {
    console.error("Error during quiz upload process:", error.message)
    process.exit(1)
  }
}

uploadQuiz()

        
