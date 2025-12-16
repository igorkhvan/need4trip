/**
 * OpenAI Client for Need4Trip
 * 
 * Provides type-safe OpenAI API integration
 * Used for AI-powered features like rules generation
 */

import { log } from "@/lib/utils/logger";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GenerateTextOptions {
  messages: OpenAIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generate text completion using OpenAI API
 * 
 * @param options - Generation options
 * @returns Generated text content
 * @throws Error if API key is missing or request fails
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    log.error("OPENAI_API_KEY is not configured");
    throw new Error("AI service is not configured. Please contact support.");
  }

  const {
    messages,
    model = "gpt-4o-mini", // Default to most cost-effective model
    temperature = 0.7,
    maxTokens = 600,
  } = options;

  try {
    log.info("Calling OpenAI API", { 
      model, 
      messageCount: messages.length,
      maxTokens 
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("OpenAI API error", { 
        status: response.status, 
        error: errorText 
      });
      
      if (response.status === 401) {
        throw new Error("AI service authentication failed");
      }
      
      if (response.status === 429) {
        throw new Error("AI service is currently busy. Please try again in a moment.");
      }
      
      throw new Error("AI service error. Please try again.");
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      log.error("OpenAI returned no choices", { data });
      throw new Error("AI service returned empty response");
    }

    const content = data.choices[0].message.content;

    log.info("OpenAI API success", {
      model: data.model,
      tokens: data.usage.total_tokens,
      contentLength: content.length,
    });

    return content;
  } catch (error) {
    if (error instanceof Error && error.message.includes("AI service")) {
      // Re-throw our custom errors
      throw error;
    }
    
    log.error("OpenAI API unexpected error", { error });
    throw new Error("Failed to generate text. Please try again.");
  }
}

/**
 * Build system prompt for event rules generation
 */
export function buildRulesSystemPrompt(): string {
  return `Ты — опытный организатор внедорожных автомобильных поездок в Казахстане.

Твоя задача: на основе данных о событии сгенерировать чёткие, структурированные ПРАВИЛА УЧАСТИЯ на русском языке.

ФОРМАТ ОТВЕТА (обязательные разделы):

**Общая информация**
- Краткое описание маршрута/цели поездки
- Дата, время, место сбора
- Ограничение по количеству участников (если указано)

**Поведение и дисциплина в колонне**
- Движение строго колонной
- Запрет на обгон ведущего
- Соблюдение дистанции
- Связь по рации (если указано в требованиях)

**Требования к автомобилю**
(Адаптируй в зависимости от типа события и требований к авто)
- Технически исправный автомобиль
- Полный бак топлива
- Запасное колесо в хорошем состоянии

**Безопасность**
- Ремни безопасности обязательны
- Трезвость за рулём
- Соблюдение скоростного режима
- При ЧП — остановка всей колонны

**Что взять с собой**
(Адаптируй к типу маршрута)
- Инструменты: домкрат, буксировочный трос, лопата
- Запчасти: камера/герметик для шин
- Вода, продукты
- Тёплая одежда (по сезону)
- Аптечка

**Дополнительные условия**
(Включи специфические требования из кастомных полей события)

**Ответственность участника**
- Участие на свой риск
- Организатор не несёт ответственности за ущерб
- Участник обязан иметь страховку

ВАЖНО:
- Пиши кратко, по делу, без воды
- Используй bullet points
- НЕ ПРИДУМЫВАЙ фактов, которых нет в данных
- Если указана рация — упомяни правила радиосвязи
- Если событие платное — упомяни оплату
- Адаптируй требования к автомобилю под категорию события`;
}
