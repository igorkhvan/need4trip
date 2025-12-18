/**
 * Event Data Resolver for AI
 * 
 * Resolves IDs to human-readable names for AI prompt generation
 * Uses cached repositories for optimal performance
 */

import { getEventCategoryById } from "@/lib/db/eventCategoryRepo";
import { getCityById } from "@/lib/db/cityRepo";
import { getCarBrandsByIds } from "@/lib/db/carBrandRepo";
import type { GenerateRulesRequest, ResolvedEventData } from "@/lib/types/ai";
import { log } from "@/lib/utils/logger";

/**
 * Map vehicle type requirement to human-readable label
 */
function getVehicleTypeLabel(requirement: string): string {
  const labels: Record<string, string> = {
    any: "Любой тип автомобиля",
    offroad: "Внедорожник",
    sedan: "Седан",
    suv: "Кроссовер",
    sportcar: "Спорткар",
    classic: "Классический автомобиль",
    other: "Другое",
  };
  
  return labels[requirement] || "Любой тип автомобиля";
}

/**
 * Resolve event IDs to human-readable data
 * 
 * @param request - AI generation request with IDs
 * @returns Resolved data ready for AI prompt
 */
export async function resolveEventData(
  request: GenerateRulesRequest
): Promise<ResolvedEventData> {
  try {
    // Resolve category name
    let categoryName = "Не указана";
    if (request.categoryId) {
      const category = await getEventCategoryById(request.categoryId);
      if (category) {
        categoryName = category.nameRu;
      }
    }

    // Resolve city name
    let cityName: string | null = null;
    if (request.cityId) {
      const city = await getCityById(request.cityId);
      if (city) {
        cityName = city.name;
      }
    }

    // Resolve brand names
    let allowedBrands: string[] = [];
    if (request.allowedBrandIds && request.allowedBrandIds.length > 0) {
      const brands = await getCarBrandsByIds(request.allowedBrandIds);
      allowedBrands = brands.map((brand) => brand.name);
    }

    // Get vehicle type label
    const vehicleTypeLabel = getVehicleTypeLabel(request.vehicleTypeRequirement);

    // Simplify custom fields
    const customFields = request.customFieldsSchema.map((field) => ({
      label: field.label,
      type: field.type,
      required: field.required,
    }));

    const resolved: ResolvedEventData = {
      title: request.title,
      description: request.description || null,
      dateTime: request.dateTime,
      cityName,
      locationText: request.locationText ?? "Не указано", // DEPRECATED: Optional field with fallback
      maxParticipants: request.maxParticipants,
      categoryName,
      vehicleTypeLabel,
      allowedBrands,
      customFields,
      isPaid: request.isPaid,
      price: request.price || null,
      currencyCode: request.currencyCode || null,
    };

    log.info("Event data resolved for AI", {
      categoryName,
      cityName,
      brandsCount: allowedBrands.length,
      fieldsCount: customFields.length,
    });

    return resolved;
  } catch (error) {
    log.error("Failed to resolve event data", { error });
    throw new Error("Failed to resolve event data for AI generation");
  }
}

/**
 * Build user prompt for OpenAI from resolved event data
 */
export function buildUserPrompt(data: ResolvedEventData): string {
  const sections: string[] = [];

  // Basic info
  sections.push(`Название: ${data.title}`);
  
  if (data.description) {
    sections.push(`Описание: ${data.description}`);
  }

  // Date & Location
  const date = new Date(data.dateTime);
  sections.push(`Дата: ${date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`);
  
  if (data.cityName) {
    sections.push(`Город: ${data.cityName}`);
  }
  
  sections.push(`Место сбора: ${data.locationText}`);

  // Participants
  if (data.maxParticipants !== null) {
    sections.push(`Макс. участников: ${data.maxParticipants}`);
  }

  // Category
  sections.push(`Категория события: ${data.categoryName}`);

  // Vehicle requirements
  sections.push(`Требование к типу авто: ${data.vehicleTypeLabel}`);
  
  if (data.allowedBrands.length > 0) {
    sections.push(`Допустимые марки авто: ${data.allowedBrands.join(", ")}`);
  }

  // Custom fields
  if (data.customFields.length > 0) {
    sections.push("\nДополнительные поля для регистрации:");
    data.customFields.forEach((field) => {
      const requiredMark = field.required ? " (обязательно)" : " (опционально)";
      sections.push(`- ${field.label} [тип: ${field.type}]${requiredMark}`);
    });
  }

  // Payment
  if (data.isPaid && data.price && data.currencyCode) {
    sections.push(`\nОплата: ${data.price} ${data.currencyCode}`);
  } else {
    sections.push("\nУчастие: БЕСПЛАТНОЕ");
  }

  return sections.join("\n");
}
