
import nodemailer from "nodemailer";
import "dotenv/config";

// Gmail OAuth2 Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Check environment variables
console.log("EMAIL_USER:", !!process.env.EMAIL_USER);
console.log("CLIENT_ID:", !!process.env.CLIENT_ID);
console.log("CLIENT_SECRET:", !!process.env.CLIENT_SECRET);
console.log("REFRESH_TOKEN:", !!process.env.REFRESH_TOKEN);

// Verify Gmail connection
transporter.verify()
  .then(() => {
    console.log("Gmail connection successful!");
    console.log("Ready to send verification emails.");
  })
  .catch((error) => {
    console.error("Gmail connection failed!");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
  });

export default transporter;
