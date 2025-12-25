/**
 * useProfileData Hook
 * 
 * Loads user profile data, stats, cars, and brands.
 * Consolidates 3 separate fetch calls into one hook with coordinated loading.
 * 
 * @returns Profile data, loading states, errors
 * 
 * @example
 * ```tsx
 * const { profileData, carsData, brandsData, loading, error } = useProfileData();
 * 
 * if (loading) return <ProfileSkeleton />;
 * if (error) return <ErrorAlert message={error} />;
 * 
 * return <ProfileView data={profileData} cars={carsData} />;
 * ```
 */

import { useState, useEffect } from "react";
import { parseApiResponse, ClientError, getErrorMessage } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";
import type { UserCar } from "@/lib/types/userCar";

// ============================================================================
// Types
// ============================================================================

interface CarBrand {
  id: string;
  name: string;
  slug: string | null;
}

interface BrandSelectOption {
  id: string;
  name: string;
}

interface VehicleType {
  value: string;
  label: string;
}

interface ProfileUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: {
    id: string;
    name: string;
    region: string;
  } | null;
  cityId: string | null;
  bio: string | null;
  createdAt: string;
}

interface ProfileStats {
  totalEvents: number;
  completedEvents: number;
  organizedEvents: number;
}

interface ProfileData {
  user: ProfileUser;
  stats: ProfileStats;
}

interface CarsData {
  cars: UserCar[];
}

interface BrandsData {
  brands: BrandSelectOption[];
  vehicleTypes: VehicleType[];
}

interface UseProfileDataReturn {
  profileData: ProfileData | null;
  carsData: CarsData | null;
  brandsData: BrandsData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useProfileData(): UseProfileDataReturn {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [carsData, setCarsData] = useState<CarsData | null>(null);
  const [brandsData, setBrandsData] = useState<BrandsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load all data in parallel
        const [profileRes, carsRes, brandsRes, typesRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/profile/cars'),
          fetch('/api/car-brands'),
          fetch('/api/vehicle-types'),
        ]);

        // Parse responses
        const profile = await parseApiResponse<ProfileData>(profileRes);
        const cars = await parseApiResponse<{ cars: UserCar[] }>(carsRes);
        const brands = await parseApiResponse<{ brands: CarBrand[] }>(brandsRes);
        const types = await parseApiResponse<{ vehicleTypes: VehicleType[] }>(typesRes);

        if (!mounted) return;

        // Set state
        setProfileData(profile);
        setCarsData({ cars: cars.cars || [] });
        setBrandsData({
          brands: brands.brands.map(b => ({ id: b.id, name: b.name })),
          vehicleTypes: types.vehicleTypes || []
        });
      } catch (err) {
        if (!mounted) return;

        if (err instanceof ClientError) {
          const message = getErrorMessage(err);
          setError(message);
          log.error('[useProfileData] Failed to load profile data', {
            code: err.code,
            statusCode: err.statusCode
          });
        } else {
          setError('Не удалось загрузить данные профиля');
          log.error('[useProfileData] Unexpected error', { error: err });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAllData();

    return () => {
      mounted = false;
    };
  }, [reloadTrigger]);

  const reload = () => {
    setReloadTrigger(prev => prev + 1);
  };

  return {
    profileData,
    carsData,
    brandsData,
    loading,
    error,
    reload,
  };
}

// ============================================================================
// Separate hooks for granular loading (if needed)
// ============================================================================

/**
 * Load only profile data (no cars/brands)
 */
export function useProfileDataOnly() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/api/profile');
        const profile = await parseApiResponse<ProfileData>(res);
        if (mounted) setData(profile);
      } catch (err) {
        if (mounted && err instanceof ClientError) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { data, loading, error };
}

/**
 * Load only cars data
 */
export function useCarsData() {
  const [data, setData] = useState<UserCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/api/profile/cars');
        const cars = await parseApiResponse<{ cars: UserCar[] }>(res);
        if (mounted) setData(cars.cars || []);
      } catch (err) {
        if (mounted && err instanceof ClientError) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { data, loading, error };
}

