/**
 * Skeleton Components
 * 
 * Barrel export для всех skeleton компонентов
 */

export { 
  ClubCardSkeleton, 
  ClubCardSkeletonGrid 
} from "./club-card-skeleton";

export { 
  EventCardSkeleton, 
  EventCardSkeletonGrid 
} from "./event-card-skeleton";

export {
  ProfileHeaderSkeleton,
  ProfileTabsSkeleton,
  ProfileCardSkeleton,
  ProfileContentSkeleton,
} from "./profile-skeleton";

export { ProfileEditSkeleton } from "./profile-edit-skeleton";

export {
  FormFieldSkeleton,
  FormTextareaSkeleton,
  FormSkeleton,
  FormPageSkeleton,
} from "./form-skeleton";

export {
  TableRowSkeleton,
  TableSkeleton,
  ParticipantsTableSkeleton,
} from "./table-skeleton";

export { ClubMembersSkeleton } from "./club-members-skeleton";
export { ClubSubscriptionSkeleton } from "./club-subscription-skeleton";
export { EventParticipantsSkeleton } from "./event-participants-skeleton";

// Club Profile (Public) skeletons per Visual Contract v2
export {
  ClubProfileHeaderSkeleton,
  ClubAboutSectionSkeleton,
  ClubMembersPreviewSkeleton,
  ClubEventsPreviewSkeleton,
  ClubJoinCTASkeleton,
  ClubProfileSkeleton,
} from "./club-profile-skeleton";

// Club Members page skeletons per Visual Contract v4
export {
  ClubMembersHeaderSkeleton,
  ClubMembersListSkeleton,
  ClubPendingJoinRequestsSkeleton,
  ClubMembersPageSkeleton,
} from "./club-members-page-skeleton";

// Club Events page skeletons per Visual Contract v1 — EVENTS
export {
  ClubEventsHeaderSkeleton,
  ClubEventsListSkeleton,
  ClubEventsPageSkeleton,
} from "./club-events-page-skeleton";

// Event Form skeleton for dynamic import fallback — SSOT_EVENTS_UX_V1.1 §1
export { EventFormSkeleton } from "./event-form-skeleton";

// Event Detail page skeleton — SSOT_UI_ASYNC_PATTERNS, SSOT_EVENTS_UX_V1.1 §2
export {
  EventDetailHeaderSkeleton,
  EventDetailProgressSkeleton,
  EventDetailCardSkeleton,
  EventDetailSidebarCardSkeleton,
  EventDetailSkeleton,
} from "./event-detail-skeleton";
