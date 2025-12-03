export type ExperienceLevel = "beginner" | "intermediate" | "pro";

export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  telegramHandle: string | null;
  telegramId?: string | null;
  avatarUrl?: string | null;
  carModel: string | null;
  experienceLevel: ExperienceLevel | null;
  createdAt: string;
  updatedAt: string;
}
