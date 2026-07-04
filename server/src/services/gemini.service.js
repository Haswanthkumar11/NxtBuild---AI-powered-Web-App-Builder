import { generateContent } from '../config/gemini.config.js';

export const askGemini = async (prompt) => {
  try {
    const response = await generateContent(prompt);

    if (!response) {
      throw new Error('Gemini returned an empty response');
    }

    return response;
  } catch (error) {
    const fallbackCode = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 2rem; background: #0f172a; color: #f8fafc; }
      .card { max-width: 640px; margin: 0 auto; background: #111827; padding: 2rem; border-radius: 16px; }
      button { padding: 0.8rem 1rem; border-radius: 999px; border: none; background: #38bdf8; color: #082f49; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Generated UI Preview</h1>
      <p>The AI service is currently unavailable, so this fallback preview is being shown.</p>
      <button>Try again later</button>
    </div>
  </body>
</html>`;

    return `Fallback response. The AI service is currently unavailable.\n\n\`\`\`html\n${fallbackCode}\n\`\`\``;
  }
};