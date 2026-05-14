import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4004;
const messages = [];

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "contact-service" });
});

app.post("/api/contact/messages", (req, res) => {
  const { name, email, topic, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "name, email, and message are required" });
  }

  const savedMessage = {
    id: `msg-${Date.now()}`,
    name,
    email,
    topic: topic || "general",
    message,
    createdAt: new Date().toISOString()
  };

  messages.push(savedMessage);
  return res.status(201).json(savedMessage);
});

app.get("/api/contact/messages", (req, res) => {
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`contact-service is running on port ${PORT}`);
});
