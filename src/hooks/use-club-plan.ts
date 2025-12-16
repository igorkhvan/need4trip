/**
 * useClubPlan Hook
 * 
 * Loads current plan and limits for a club
 * Used in forms to show dynamic validation and hints
 * 
 * Source: BILLING_FRONTEND_ANALYSIS.md
 */

"use client";

import { useEffect, useState } from "react";
import { type PlanId } from "@/lib/types/billing";
import { log } from "@/lib/utils/logger";

export interface ClubPlanLimits {
  maxMembers: number | null;
  maxEventParticipants: number | null;
  allowPaidEvents: boolean;
  allowCsvExport: boolean;
}

export interface ClubPlanData {
  planId: PlanId | "free";
  planTitle: string;
  subscription: {
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    graceUntil: string | null;
  } | null;
  limits: ClubPlanLimits;
}

interface UseClubPlanReturn {
  plan: ClubPlanData | null;
  limits: ClubPlanLimits | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get current plan and limits for a club
 * 
 * @param clubId - Club ID (null = Free plan)
 * @returns Plan data, limits, loading state, error
 * 
 * @example
 * ```tsx
 * const { plan, limits, loading } = useClubPlan(clubId);
 * 
 * if (loading) return <Spinner />;
 * 
 * const maxParticipants = limits?.maxEventParticipants ?? 15;
 * // Use maxParticipants for validation
 * ```
 */
export function useClubPlan(clubId: string | null | undefined): UseClubPlanReturn {
  const [plan, setPlan] = useState<ClubPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no clubId, fetch Free plan from API (to get actual DB values)
    if (!clubId) {
      let mounted = true;
      
      const fetchFreePlan = async () => {
        setLoading(true);
        setError(null);
        
        try {
          const res = await fetch('/api/clubs/personal/current-plan');
          
          if (!res.ok) {
            throw new Error('Failed to fetch Free plan');
          }
          
          const data = await res.json();
          
          if (!mounted) return;
          
          if (data.success) {
            setPlan(data.data);
          } else {
            throw new Error(data.error?.message || 'Failed to fetch Free plan');
          }
        } catch (err) {
          if (!mounted) return;
          
          log.error("Failed to fetch Free plan", { error: err });
          
          // Fallback to hardcoded defaults only on error
          setPlan({
            planId: "free",
            planTitle: "Free",
            subscription: null,
            limits: {
              maxMembers: null,
              maxEventParticipants: 15, // Last resort fallback
              allowPaidEvents: false,
              allowCsvExport: false,
            },
          });
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };
      
      fetchFreePlan();
      
      return () => {
        mounted = false;
      };
    }

    // Fetch club plan from API
    let mounted = true;

    const fetchPlan = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/clubs/${clubId}/current-plan`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Клуб не найден");
          }
          throw new Error("Не удалось загрузить план клуба");
        }

        const data = await res.json();

        if (!mounted) return;

        if (data.success) {
          setPlan(data.data);
        } else {
          throw new Error(data.error?.message || "Ошибка загрузки плана");
        }
      } catch (err) {
        if (!mounted) return;

        const message = err instanceof Error ? err.message : "Ошибка загрузки плана";
        setError(message);
        log.error("Failed to fetch club plan", { clubId, error: err });

        // Fallback to safe FREE defaults
        setPlan({
          planId: "free",
          planTitle: "Free",
          subscription: null,
          limits: {
            maxMembers: null,
            maxEventParticipants: 15, // Safe default
            allowPaidEvents: false,
            allowCsvExport: false,
          },
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPlan();

    return () => {
      mounted = false;
    };
  }, [clubId]);

  return {
    plan,
    limits: plan?.limits ?? null,
    loading,
    error,
  };
}
