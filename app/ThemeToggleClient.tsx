"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleClient() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("foodhub_theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark-theme");
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark-theme");
      localStorage.setItem("foodhub_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-theme");
      localStorage.setItem("foodhub_theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs shadow-lg border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 bg-white/90 backdrop-blur-md text-slate-800 border-slate-200/80 dark-toggle-btn"
      title="Đổi giao diện Sáng / Tối"
    >
      {dark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Chế độ Sáng</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-teal-700 fill-teal-700" />
          <span>Chế độ Tối</span>
        </>
      )}
    </button>
  );
}