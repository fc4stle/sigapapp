"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "sigap-a11y-mode";

export default function AccessibilityToggle() {
  const [a11yMode, setA11yMode] = useState(false);
  const [ready, setReady] = useState(false);

  // Read localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setA11yMode(true);
      document.documentElement.classList.add("a11y-mode");
    }
    setReady(true);
  }, []);

  // Sync class and localStorage when a11yMode changes
  useEffect(() => {
    if (!ready) return;
    if (a11yMode) {
      document.documentElement.classList.add("a11y-mode");
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      document.documentElement.classList.remove("a11y-mode");
      localStorage.setItem(STORAGE_KEY, "false");
    }
  }, [a11yMode, ready]);

  if (!ready) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setA11yMode(!a11yMode)}
      aria-label={
        a11yMode
          ? "Nonaktifkan mode aksesibilitas"
          : "Aktifkan mode aksesibilitas"
      }
      aria-pressed={a11yMode}
      className="fixed top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <span className="text-lg font-bold">A</span>
      {a11yMode && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-background">
          ✓
        </span>
      )}
    </button>
  );
}
