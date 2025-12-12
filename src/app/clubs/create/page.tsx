/**
 * Create Club Page
 * 
 * Страница создания нового клуба
 */

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClubForm } from "@/components/clubs/club-form";

export default function CreateClubPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Кнопка назад */}
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к списку клубов
        </Link>

        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Создать клуб</h1>
          <p className="text-gray-600 mt-2">
            Создайте клуб и соберите единомышленников для совместных путешествий
          </p>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ClubForm mode="create" />
        </div>
      </div>
    </div>
  );
}

