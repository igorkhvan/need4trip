import type { UserCar } from "../types/userCar";
import { getCarBrandsByIds } from "../db/carBrandRepo";

/**
 * Гидратировать автомобили (добавить данные о марках)
 */
export async function hydrateUserCars(cars: UserCar[]): Promise<UserCar[]> {
  if (cars.length === 0) return [];

  // Получить уникальные brand IDs
  const brandIds = [...new Set(cars.map((c) => c.carBrandId))];

  // Batch load brands
  const brands = await getCarBrandsByIds(brandIds);
  const brandsMap = new Map(brands.map((b) => [b.id, b]));

  // Attach brands to cars
  return cars.map((car) => ({
    ...car,
    carBrand: brandsMap.get(car.carBrandId) || null,
  }));
}

