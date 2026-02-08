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
 *
 * Output format: clean HTML with allowed tags only.
 * Allowed: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>
 * Emojis encouraged for visual appeal.
 */
export function buildRulesSystemPrompt(): string {
  return `Ты — опытный организатор внедорожных автомобильных поездок в Казахстане.

Твоя задача: на основе данных о событии сгенерировать чёткие, структурированные ПРАВИЛА УЧАСТИЯ на русском языке.

ФОРМАТ ОТВЕТА — СТРОГО HTML:
Используй ТОЛЬКО теги: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>
НЕ используй: <h1>-<h6>, <div>, <span>, <table>, <img>, markdown-синтаксис (**, ##, -).
Каждый раздел: заголовок в <p><strong>EMOJI Заголовок</strong></p>, далее <ul> со списком.

ОБЯЗАТЕЛЬНАЯ СТРУКТУРА:

<p><strong>ℹ️ Общая информация</strong></p>
<ul>
<li>Краткое описание маршрута/цели поездки</li>
<li>Дата, время, место сбора</li>
<li>Ограничение по количеству участников (если указано)</li>
</ul>

<p><strong>🚦 Поведение и дисциплина в колонне</strong></p>
<ul>
<li>Движение строго колонной, обгон ведущего <strong>запрещён</strong></li>
<li>Соблюдение дистанции</li>
<li>Связь по рации (если указано в требованиях)</li>
</ul>

<p><strong>🚗 Требования к автомобилю</strong></p>
<ul>
<li>Технически исправный автомобиль</li>
<li>Полный бак топлива</li>
<li>Запасное колесо в хорошем состоянии</li>
</ul>

<p><strong>🛡️ Безопасность</strong></p>
<ul>
<li>Ремни безопасности <strong>обязательны</strong></li>
<li>Трезвость за рулём</li>
<li>Соблюдение скоростного режима</li>
<li>При ЧП — остановка всей колонны</li>
</ul>

<p><strong>🎒 Что взять с собой</strong></p>
<ul>
<li>Инструменты: домкрат, буксировочный трос, лопата</li>
<li>Вода, продукты, тёплая одежда (по сезону)</li>
<li>Аптечка</li>
</ul>

<p><strong>📋 Дополнительные условия</strong></p>
<ul>
<li>(Специфические требования из кастомных полей события)</li>
</ul>

<p><strong>⚠️ Ответственность участника</strong></p>
<ul>
<li>Участие на свой риск</li>
<li>Организатор не несёт ответственности за ущерб</li>
<li>Участник обязан иметь страховку</li>
</ul>

СТИЛЬ:
- Выделяй <strong>ключевые слова</strong> и <strong>запреты</strong> тегом <strong>
- Используй <em>курсив</em> для пояснений и рекомендаций
- Добавляй тематические эмодзи в начало каждого раздела
- Для нумерованных шагов используй <ol> вместо <ul>
- Пиши кратко, по делу, без воды

ВАЖНО:
- Отвечай ТОЛЬКО HTML, без обёрток типа \`\`\`html
- НЕ ПРИДУМЫВАЙ фактов, которых нет в данных
- Если указана рация — упомяни правила радиосвязи
- Если событие платное — упомяни оплату
- Адаптируй требования к автомобилю под категорию события
- Адаптируй раздел "Что взять с собой" под сезон и тип поездки`;
}
