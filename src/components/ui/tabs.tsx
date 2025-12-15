/**
 * Tabs Component
 * 
 * Унифицированный компонент табов согласно дизайн-системе
 * Эталон: страница событий (оранжевый)
 */

import React from "react";

export interface Tab {
  id: string;
  label: string;
  hidden?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  const visibleTabs = tabs.filter(tab => !tab.hidden);

  return (
    <div className={`flex items-center gap-0 mb-6 border-b border-[var(--color-border)] ${className}`}>
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-3 text-base border-b-2 transition-colors ${
            activeTab === tab.id
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
