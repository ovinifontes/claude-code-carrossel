---
name: nano-banana-pro
description: "Generate and edit images using Google's Gemini 3 Pro Image API (Nano Banana Pro). Use when needing to create AI-generated images from text prompts or edit existing images. Supports 1K, 2K, and 4K resolutions."
---

# Nano Banana Pro — Image Generation & Editing

## Overview
Generates and edits images using Google's Gemini 3 Pro Image API via direct API calls.

## API Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent
```

## Authentication
- Requires `GEMINI_API_KEY` environment variable
- Pass as query parameter: `?key=${GEMINI_API_KEY}`

## Text-to-Image Generation (TypeScript)

```typescript
async function generateImage(prompt: string, apiKey: string): Promise<Buffer> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          responseMimeType: "image/png",
        },
      }),
    }
  );

  const data = await response.json();
  const imageData = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imageData) throw new Error("No image returned from Gemini API");

  return Buffer.from(imageData.inlineData.data, "base64");
}
```

## Resolution Tiers
- **1K** (~1024px) — default, fastest, use for drafts
- **2K** (~2048px) — medium quality
- **4K** (~4096px) — highest quality, use only when prompt is finalized

## Recommended Workflow
1. **Draft (1K):** Quick iteration to refine prompt
2. **Iterate:** Adjust prompt based on results
3. **Final (4K):** Render at highest quality once satisfied

## Prompt Guidance
- Be specific and descriptive
- For edits: "Change ONLY: <modification>. Keep identical: everything else."
- Include style references: "digital art", "flat design", "minimalist illustration"
- For branded content: specify colors, mood, and composition

## Filename Convention
Pattern: `{yyyy-mm-dd-hh-mm-ss}-{descriptive-name}.png`
