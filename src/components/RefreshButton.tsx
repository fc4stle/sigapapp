"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [flashEffect, setFlashEffect] = useState(false);
  const router = useRouter();

  function triggerFlash() {
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 1200);
  }

  async function handleRefresh() {
    setLoading(true);
    setMessage("");
    try {
      const results = await Promise.all([
        fetch("/api/fetch-gempa"),
        fetch("/api/fetch-kualitas-udara"),
      ]);
      if (results.some((res) => !res.ok)) {
        setMessage("Gagal memperbarui data");
      } else {
        setMessage("Data berhasil diperbarui");
        router.refresh();
        triggerFlash();
      }
    } catch {
      setMessage("Gagal memperbarui data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={loading}
        aria-label="Perbarui data gempa dan kualitas udara"
        className={`rounded border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50 ${
          flashEffect ? "flash-effect" : ""
        }`}
      >
        {loading ? "Memuat data" : "Perbarui data"}
      </button>
      {message && <span className="text-sm text-muted">{message}</span>}
    </div>
  );
}
