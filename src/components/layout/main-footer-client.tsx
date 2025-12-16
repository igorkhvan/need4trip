"use client";

import Link from "next/link";
import { Car } from "lucide-react";
import { CreateEventButton } from "@/components/events/create-event-button";

export function MainFooter({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="mt-24 border-t border-[#E5E7EB] bg-white">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6F2C]">
                <Car className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-semibold text-[#111827]">Need4Trip</span>
            </div>
            <p className="max-w-md text-base text-[#6B7280]">
              Организация автомобильных поездок и учёт экипажей в пару кликов
            </p>
          </div>

          {/* Links - Product */}
          <div>
            <h4 className="mb-4 text-xl font-semibold text-[#111827]">Продукт</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/events"
                  className="text-base text-[#6B7280] transition-colors hover:text-[#FF6F2C]"
                >
                  События
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-base text-[#6B7280] transition-colors hover:text-[#FF6F2C]"
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
                  className="text-base text-[#6B7280] transition-colors hover:text-[#FF6F2C] text-left"
                >
                  Создать событие
                </button>
              </li>
            </ul>
          </div>

          {/* Links - Contact */}
          <div>
            <h4 className="mb-4 text-xl font-semibold text-[#111827]">Контакты</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://t.me/need4trip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-[#6B7280] transition-colors hover:text-[#FF6F2C]"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@need4trip.app"
                  className="text-base text-[#6B7280] transition-colors hover:text-[#FF6F2C]"
                >
                  Поддержка
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[#E5E7EB] pt-8 text-center">
          <p className="text-sm text-[#6B7280]">
            © {new Date().getFullYear()} Need4Trip · бета-версия · Made in KZ 🇰🇿
          </p>
        </div>
      </div>
    </footer>
  );
}

