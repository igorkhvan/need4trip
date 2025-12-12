/**
 * 404 Not Found Page
 * 
 * Custom 404 page with car illustration
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Car Illustration */}
        <div className="mb-8">
          <svg
            className="w-full max-w-md mx-auto"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Road */}
            <rect x="0" y="200" width="400" height="100" fill="#E5E7EB" />
            <rect x="0" y="245" width="60" height="10" fill="#FFF" />
            <rect x="80" y="245" width="60" height="10" fill="#FFF" />
            <rect x="160" y="245" width="60" height="10" fill="#FFF" />
            <rect x="240" y="245" width="60" height="10" fill="#FFF" />
            <rect x="320" y="245" width="60" height="10" fill="#FFF" />
            
            {/* Car Body */}
            <path
              d="M100 180 L120 150 L180 140 L220 140 L260 150 L280 180 Z"
              fill="#FF6F2C"
            />
            <rect x="90" y="180" width="200" height="40" rx="5" fill="#FF6F2C" />
            
            {/* Windows */}
            <path
              d="M130 155 L145 145 L175 145 L185 155 Z"
              fill="#93C5FD"
              opacity="0.6"
            />
            <path
              d="M195 155 L205 145 L235 145 L250 155 Z"
              fill="#93C5FD"
              opacity="0.6"
            />
            
            {/* Wheels */}
            <circle cx="130" cy="220" r="25" fill="#1F2937" />
            <circle cx="130" cy="220" r="15" fill="#6B7280" />
            <circle cx="250" cy="220" r="25" fill="#1F2937" />
            <circle cx="250" cy="220" r="15" fill="#6B7280" />
            
            {/* Headlights */}
            <circle cx="95" cy="190" r="8" fill="#FCD34D" />
            <circle cx="285" cy="190" r="8" fill="#F87171" />
            
            {/* Details */}
            <line x1="190" y1="180" x2="190" y2="220" stroke="#374151" strokeWidth="2" />
          </svg>
        </div>

        {/* 404 Text */}
        <h1 className="text-6xl font-bold text-[#0F172A] mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Страница не найдена
        </h2>
        
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Похоже, вы свернули не туда. Эта страница не существует или была перемещена.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="javascript:history.back()" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Назад
            </Link>
          </Button>
          
          <Button size="lg" asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              На главную
            </Link>
          </Button>
        </div>

        {/* Additional Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Может быть, вас заинтересует:
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link
              href="/events"
              className="text-[#FF6F2C] hover:text-[#FF8C4D] font-medium"
            >
              События
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/clubs"
              className="text-[#FF6F2C] hover:text-[#FF8C4D] font-medium"
            >
              Клубы
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/profile"
              className="text-[#FF6F2C] hover:text-[#FF8C4D] font-medium"
            >
              Профиль
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/pricing"
              className="text-[#FF6F2C] hover:text-[#FF8C4D] font-medium"
            >
              Тарифы
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

