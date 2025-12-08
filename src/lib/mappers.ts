import {
  EventCustomFieldsSchema,
  EventCustomFieldValues,
  Event as DomainEvent,
} from "@/lib/types/event";
import { DomainParticipant, ParticipantRole } from "@/lib/types/participant";

export interface DbEvent {
  id: string;
  title: string;
  description: string;
  category: DomainEvent["category"];
  date_time: string;
  location_text: string;
  location_lat: number | null;
  location_lng: number | null;
  max_participants: number | null;
  custom_fields_schema: EventCustomFieldsSchema;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  visibility: DomainEvent["visibility"];
  vehicle_type_requirement: DomainEvent["vehicleTypeRequirement"];
  rules: string | null;
  is_club_event: boolean;
  is_paid: boolean;
  price: number | null;
  currency: string | null;
}

export interface DbParticipant {
  id: string;
  event_id: string;
  user_id: string | null;
  guest_session_id: string | null;
  display_name: string;
  role: ParticipantRole;
  custom_field_values: EventCustomFieldValues;
  created_at: string;
}

export interface DbEventWithOwner extends DbEvent {
  created_by_user?: {
    id: string;
    name: string;
    telegram_handle: string | null;
  } | null;
}

export function mapDbEventToDomain(db: DbEvent): DomainEvent {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    category: db.category,
    dateTime: db.date_time,
    locationText: db.location_text,
    locationLat: db.location_lat,
    locationLng: db.location_lng,
    maxParticipants: db.max_participants,
    customFieldsSchema: db.custom_fields_schema ?? [],
    createdByUserId: db.created_by_user_id ?? null,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    visibility: db.visibility ?? "public",
    vehicleTypeRequirement: db.vehicle_type_requirement ?? "any",
    allowedBrands: [],
    rules: db.rules ?? null,
    isClubEvent: db.is_club_event ?? false,
    isPaid: db.is_paid ?? false,
    price: db.price ?? null,
    currency: db.currency ?? null,
  };
}

export function mapDbEventWithOwnerToDomain(db: DbEventWithOwner): DomainEvent {
  const event = mapDbEventToDomain(db);
  const ownerName = db.created_by_user?.name ?? null;
  const ownerHandle = db.created_by_user?.telegram_handle ?? null;
  return {
    ...event,
    ownerName,
    ownerHandle,
  } as DomainEvent & { ownerName: string | null; ownerHandle: string | null };
}

export function mapDbParticipantToDomain(db: DbParticipant): DomainParticipant {
  return {
    id: db.id,
    eventId: db.event_id,
    userId: db.user_id,
    guestSessionId: db.guest_session_id,
    displayName: db.display_name,
    role: db.role,
    customFieldValues: db.custom_field_values ?? {},
    createdAt: db.created_at,
  };
}
