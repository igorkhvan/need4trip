import { z } from "zod";

import { EventCustomFieldValue, EventCustomFieldValues } from "./event";
import { User } from "./user";

export const participantRoleSchema = z.enum(["leader", "tail", "participant"]);
export type ParticipantRole = z.infer<typeof participantRoleSchema>;

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string | null;
  displayName: string;
  role: ParticipantRole;
  customFieldValues: Record<string, EventCustomFieldValue>;
  createdAt: string;
  user?: User;
}

export type DomainParticipant = EventParticipant;

export interface RegisterParticipantPayload {
  eventId: string;
  userId?: string | null;
  displayName: string;
  role: ParticipantRole;
  customFieldValues?: EventCustomFieldValues;
}

export const participantInputSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  role: participantRoleSchema.default("participant"),
  customFieldValues: z.record(z.any()).default({}),
  userId: z.string().uuid().optional().nullable(),
});

export type ParticipantInput = z.infer<typeof participantInputSchema>;
