"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateEventButton } from "@/components/events/create-event-button";

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F7F7F8] to-white py-24 md:py-40">
      <div className="page-container">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="heading-hero mb-6">
            Организация автомобильных поездок и учёт экипажей в пару кликов
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-[#374151]">
            Need4Trip помогает клубам и организаторам поездок собирать экипажи, настраивать регистрацию
            и управлять колонной в удобном интерфейсе.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <CreateEventButton 
              isAuthenticated={isAuthenticated}
              size="lg"
            />
            <Button size="lg" variant="secondary" asChild>
              <Link href="/events">Посмотреть события</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

