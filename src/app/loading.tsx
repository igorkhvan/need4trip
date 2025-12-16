import { HomepageSkeleton } from "@/components/ui/skeletons/homepage-skeleton";

/**
 * Root Loading State
 * 
 * Показывается при route transitions и initial page load.
 * Использует skeleton вместо spinner для лучшего UX.
 */
export default function Loading() {
  return <HomepageSkeleton />;
}

