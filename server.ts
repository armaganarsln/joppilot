import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // Returns WebRTC ICE servers (STUN + short-lived Cloudflare TURN credentials)
  // for teleoperation. The Cloudflare API token never leaves the server; the
  // client only ever receives time-limited TURN credentials. If TURN is not
  // configured, falls back to STUN-only so same-network teleop still works.
  app.get("/api/ice-servers", async (_req, res) => {
    const stunOnly = [{ urls: "stun:stun.l.google.com:19302" }];

    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
    if (!keyId || !apiToken || keyId === "MY_CLOUDFLARE_TURN_KEY_ID") {
      return res.json({ iceServers: stunOnly });
    }

    try {
      const cfResponse = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 86400 }),
        }
      );

      if (!cfResponse.ok) {
        console.error("Cloudflare TURN request failed:", cfResponse.status, await cfResponse.text());
        return res.json({ iceServers: stunOnly });
      }

      const data = await cfResponse.json();
      // Cloudflare returns { iceServers: { urls: [...], username, credential } }.
      const cfIce = data.iceServers;
      const iceServers = Array.isArray(cfIce) ? cfIce : [cfIce];
      res.json({ iceServers: [...stunOnly, ...iceServers] });
    } catch (error) {
      console.error("Error fetching Cloudflare TURN credentials:", error);
      res.json({ iceServers: stunOnly });
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
