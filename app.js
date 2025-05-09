const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// Utility: Time-based greeting
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Utility: Extract sender's name from email content (basic pattern)
function extractSenderName(emailContent) {
  const match = emailContent.match(/(?:From|Regards|Best|Thanks|Sincerely),?\s*\n?([A-Z][a-z]+\s?[A-Z]?[a-z]*)/i);
  return match ? match[1].trim() : "Sir/Madam";
}

app.post("/generate-reply", async (req, res) => {
  const { emailContent, replyUserName } = req.body;

  console.log(emailContent)

  console.log("Received email content:", emailContent);
  console.log("Replying as:", replyUserName);

  const senderName = extractSenderName(emailContent);
  const greeting = `${getTimeBasedGreeting()} ${senderName},`;

  try {
    const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const prompt = `
You are an AI email assistant.

Your task is to generate a **professional, clear, and grammatically correct email reply** that is **at least 50 words long**, requires no user editing, and is immediately ready to send.

Instructions:
- Extract the sender's name from the email provided and use it in a polite greeting.
- Begin the reply with a time-based greeting like "Good morning", "Good afternoon", or "Good evening", followed by the sender's name.
- Write a polite, relevant, and logically connected response to the message.
- Include a meaningful subject line.
- End the email with an appropriate closing (e.g., "Best regards") and the name of the replier: **${replyUserName}**
- Do **not** include the original email in the response.

Here is the received email content:

${emailContent}
`;


    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    const response = await axios.post(geminiURL, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const rawText = response.data.candidates[0]?.content?.parts[0]?.text || "No reply generated.";

    const [subjectLine, ...bodyLines] = rawText.split('\n\n');
    const reply = bodyLines.join('\n\n').replace(/^Email:\s*/i, '');
    const subject = subjectLine.replace(/^Subject:\s*/i, '');
    console.log("Generated reply:", reply);
    res.json({ reply, subject });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Gemini reply generation failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
