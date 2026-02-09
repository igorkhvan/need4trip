/**
 * API: /api/ai/events/generate-rules
 * 
 * POST - Generate event rules using AI
 * 
 * Security:
 * - Requires authentication
 * - OpenAI key never exposed to client
 * - Rate limiting: 3 requests/minute (critical tier)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { respondError, respondJSON } from "@/lib/api/response";
import { AuthError, ValidationError } from "@/lib/errors";
import { trackWriteAction } from "@/lib/telemetry/abuseTelemetry";
import { 
  generateRulesRequestSchema, 
  type GenerateRulesResponse 
} from "@/lib/types/ai";
import { resolveEventData, buildUserPrompt } from "@/lib/services/ai/eventDataResolver";
import { generateText, buildRulesSystemPrompt } from "@/lib/services/ai/openai";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/events/generate-rules
 * 
 * Generate event rules using AI based on event data
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get user from middleware (JWT already verified)
    const currentUser = await getCurrentUserFromMiddleware(request);
    if (!currentUser) {
      throw new AuthError("Авторизация обязательна для использования AI");
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = generateRulesRequestSchema.safeParse(body);

    if (!parsed.success) {
      log.warn("Invalid AI generation request", { 
        errors: parsed.error.errors,
        userId: currentUser.id 
      });
      throw new ValidationError("Неверный формат данных события");
    }

    const eventData = parsed.data;

    log.info("AI rules generation requested", {
      userId: currentUser.id,
      eventId: eventData.eventId,
      title: eventData.title,
    });

    // 3. Resolve IDs to human-readable names
    const resolved = await resolveEventData(eventData);

    // 4. Build AI prompts
    const systemPrompt = buildRulesSystemPrompt();
    const userPrompt = buildUserPrompt(resolved);

    // 5. Call OpenAI
    const rulesText = await generateText({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 1200, // HTML with emojis needs more tokens than plain text
    });

    log.info("AI rules generated successfully", {
      userId: currentUser.id,
      eventId: eventData.eventId,
      rulesLength: rulesText.length,
    });

    // Fire-and-forget: abuse telemetry
    trackWriteAction(currentUser.id, 'ai.generate_rules');

    // 6. Return response
    const response: GenerateRulesResponse = {
      rulesText: rulesText.trim(),
    };

    return respondJSON(response);
  } catch (error) {
    // Log error but return safe user message
    log.error("AI rules generation failed", { error });
    return respondError(error);
  }
}
