"use client";

import Link from "next/link";
import { Car } from "lucide-react";
import { CreateEventButton } from "@/components/events/create-event-button";

export function MainFooter({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="mt-20 border-t border-[#E5E7EB] bg-white md:mt-24">
      <div className="page-container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6F2C]">
                <Car className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-semibold text-[#111827]">Need4Trip</span>
            </div>
            <p className="max-w-md text-sm text-[#6B7280] md:text-base">
              Организация автомобильных поездок и учёт экипажей в пару кликов
            </p>
          </div>

          {/* Links - Product */}
          <div>
            <h4 className="mb-3 text-lg font-semibold text-[#111827] md:mb-4 md:text-xl">Продукт</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/events"
                  className="text-sm text-[#6B7280] transition-colors hover:text-[#FF6F2C] md:text-base"
                >
                  События
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-sm text-[#6B7280] transition-colors hover:text-[#FF6F2C] md:text-base"
                >
                  Как это работает
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    // This will be handled by the global modal
                    // For simplicity, let's keep the link visual
                  }}
                  className="text-left text-sm text-[#6B7280] transition-colors hover:text-[#FF6F2C] md:text-base"
                >
                  Создать событие
                </button>
              </li>
            </ul>
          </div>

          {/* Links - Contact */}
          <div>
            <h4 className="mb-3 text-lg font-semibold text-[#111827] md:mb-4 md:text-xl">Контакты</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://t.me/need4trip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#6B7280] transition-colors hover:text-[#FF6F2C] md:text-base"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@need4trip.app"
                  className="text-sm text-[#6B7280] transition-colors hover:text-[#FF6F2C] md:text-base"
                >
                  Поддержка
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-[#E5E7EB] pt-6 text-center md:mt-8 md:pt-8">
          <p className="text-xs text-[#6B7280] md:text-sm">
            © {new Date().getFullYear()} Need4Trip · бета-версия · Made in KZ 🇰🇿
          </p>
        </div>
      </div>
    </footer>
  );
}

