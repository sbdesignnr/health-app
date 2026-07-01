import Anthropic from "@anthropic-ai/sdk";

// Anthropic klient – číta ANTHROPIC_API_KEY z prostredia (Next.js / .env.local).
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
