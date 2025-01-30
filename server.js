const admin = require("firebase-admin");
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());

// Firebase Admin SDK initialization
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

// Verify the token sent by the client
app.post("/verify-token", (req, res) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  admin.auth().verifyIdToken(token)
    .then(() => {
      // Set a session or cookie to track the user's authentication status
      res.cookie("authenticated", "true", { httpOnly: true, path: "/" });
      res.send("Authenticated");
    })
    .catch(() => {
      res.status(401).send("Unauthorized");
    });
});
      
