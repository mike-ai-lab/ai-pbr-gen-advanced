import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 texture images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to initialize Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Status Check API Endpoint
app.get("/api/health", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({
      status: "degraded",
      hasKey: false,
      message: "GEMINI_API_KEY is missing. AI synthesis will use procedural / sample fallback mode.",
    });
    return;
  }

  try {
    const ai = getGeminiClient();
    res.json({
      status: "ok",
      hasKey: true,
      model: "gemini-3.1-flash-image",
      message: "Gemini AI connected successfully.",
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      hasKey: false,
      message: error?.message || "Failed to initialize Gemini AI client.",
    });
  }
});

// 2. Albedo Generation Endpoint
app.post("/api/generate-albedo", async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType, resolution = "1K", seamlesslyTileable = true } = req.body;

    if (!prompt && !imageBase64) {
      res.status(400).json({ error: "Either text prompt or reference image is required." });
      return;
    }

    const ai = getGeminiClient();

    // Construct detailed PBR Albedo prompt
    let pbrPrompt = `A flat-lit, top-down orthographic base color (albedo) texture map of: ${prompt || "the material shown in the image"}. `;
    pbrPrompt += `CRITICAL PBR SPECIFICATIONS: Zero shadows, zero specular highlights, flat uniform diffuse lighting, completely macro top-down view, perfectly square orthographic frame, clean studio quality game asset material texture. `;
    if (seamlesslyTileable) {
      pbrPrompt += `Must be a seamless, infinitely tileable pattern without visible border seams or vignetting.`;
    }

    const parts: any[] = [];

    // If an image was uploaded, include it as reference
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || "image/png",
        },
      });
      parts.push({
        text: `Extract the core surface material texture from this reference image and create a clean flat orthographic tileable PBR Albedo texture map. ${pbrPrompt}`,
      });
    } else {
      parts.push({ text: pbrPrompt });
    }

    // Try gemini-3.1-flash-image first, fallback to gemini-3.1-flash-lite-image if needed
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: resolution as any,
          },
        },
      });
    } catch (e: any) {
      console.warn("Primary image model failed, trying fallback model:", e?.message);
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: { parts },
      });
    }

    // Find the inline image in candidates
    let imageOutputData: string | null = null;
    let textOutput: string | null = null;

    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageOutputData = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textOutput = part.text;
        }
      }
    }

    if (!imageOutputData) {
      res.status(500).json({
        error: "No image output returned from AI model.",
        text: textOutput,
      });
      return;
    }

    res.json({
      success: true,
      imageUrl: imageOutputData,
      description: textOutput,
    });
  } catch (error: any) {
    console.error("Albedo generation error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate Albedo texture using Gemini AI.",
    });
  }
});

// 3. Albedo Refinement Endpoint
app.post("/api/refine-albedo", async (req, res) => {
  try {
    const { currentImageBase64, refinementPrompt, mimeType } = req.body;

    if (!currentImageBase64 || !refinementPrompt) {
      res.status(400).json({ error: "Current image and refinement instructions are required." });
      return;
    }

    const ai = getGeminiClient();
    const cleanBase64 = currentImageBase64.replace(/^data:image\/\w+;base64,/, "");

    const parts = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || "image/png",
        },
      },
      {
        text: `Modify this PBR Albedo texture according to this adjustment: "${refinementPrompt}". Maintain the top-down orthographic flat-lit seamless texture structure with zero baked lighting.`,
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: { parts },
    });

    let imageOutputData: string | null = null;
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageOutputData = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        }
      }
    }

    if (!imageOutputData) {
      res.status(500).json({ error: "Failed to refine texture image." });
      return;
    }

    res.json({
      success: true,
      imageUrl: imageOutputData,
    });
  } catch (error: any) {
    console.error("Albedo refinement error:", error);
    res.status(500).json({ error: error?.message || "Refinement failed." });
  }
});

// Setup Vite Development or Production Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PBR Material Generator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
