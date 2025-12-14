import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { respondSuccess, respondError } from "@/lib/api/response";
import { AuthError } from "@/lib/errors";
import {
  getUserCars,
  createUserCar,
  deleteUserCar,
  setPrimaryUserCar,
} from "@/lib/db/userCarRepo";
import { hydrateUserCars } from "@/lib/services/userCars";
import { userCarCreateSchema } from "@/lib/types/userCar";

/**
 * GET /api/profile/cars
 * Получить список автомобилей текущего пользователя
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthError("Необходима авторизация", 401);
    }

    const cars = await getUserCars(user.id);
    const hydratedCars = await hydrateUserCars(cars);

    return respondSuccess({ cars: hydratedCars });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * POST /api/profile/cars
 * Создать новый автомобиль
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthError("Необходима авторизация", 401);
    }

    const body = await req.json();
    const input = userCarCreateSchema.parse(body);

    const car = await createUserCar(user.id, input);
    const [hydratedCar] = await hydrateUserCars([car]);

    return respondSuccess({ car: hydratedCar }, undefined, 201);
  } catch (error) {
    return respondError(error);
  }
}

/**
 * DELETE /api/profile/cars?id=...
 * Удалить автомобиль
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthError("Необходима авторизация", 401);
    }

    const { searchParams } = new URL(req.url);
    const carId = searchParams.get("id");

    if (!carId) {
      throw new Error("Car ID is required");
    }

    await deleteUserCar(user.id, carId);

    return respondSuccess({ message: "Автомобиль удален" });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * PATCH /api/profile/cars?id=...
 * Установить основной автомобиль
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthError("Необходима авторизация", 401);
    }

    const { searchParams } = new URL(req.url);
    const carId = searchParams.get("id");

    if (!carId) {
      throw new Error("Car ID is required");
    }

    await setPrimaryUserCar(user.id, carId);

    return respondSuccess({ message: "Основной автомобиль изменен" });
  } catch (error) {
    return respondError(error);
  }
}

