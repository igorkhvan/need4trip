/**
 * Create Club Page Content
 * 
 * Клиентский компонент для создания клуба
 */

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClubForm } from "@/components/clubs/club-form";

export function CreateClubPageContent() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Кнопка назад */}
        <Link
          href="/clubs"
          className="mb-6 inline-flex items-center gap-2 text-[#6B7280] transition-colors hover:text-[#1F2937]"
        >
          <ArrowLeft className="h-5 w-5" />
          Назад к списку клубов
        </Link>

        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#1F2937] md:text-[32px]">Создать клуб</h1>
          <p className="mt-2 text-[15px] text-[#6B7280]">
            Создайте клуб и соберите единомышленников для совместных путешествий
          </p>
        </div>

        {/* Форма */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <ClubForm mode="create" />
        </div>
      </div>
    </div>
  );
}

