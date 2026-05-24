import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Fleet Assistant chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, fleetState } = req.body;
      
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        return res.json({ 
          reply: "To use the Jöppli AI Assistant, configure the GEMINI_API_KEY secret in AI Studio settings."
        });
      }

      const prompt = `
        You are the AI Assistant for Jöppli's autonomous recycling fleet in Alt-Wiedikon.
        The operator says: "${message}"
        
        Current Fleet State (JSON):
        ${JSON.stringify(fleetState, null, 2)}
        
        Answer professionally, concisely, and with Swiss precision. Use metric units.
        Keep it brief (max 2-3 sentences), simulating a capable operations bot for an autonomous logistics system.
      `;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      res.json({ reply: aiResponse.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ reply: "Error contacting fleet intelligence." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
