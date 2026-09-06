"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleRefresh() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/fetch-gempa");
      if (!res.ok) {
        setMessage("Gagal refresh data");
      } else {
        setMessage("Data berhasil diperbarui");
        router.refresh();
      }
    } catch {
      setMessage("Gagal refresh data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Memuat..." : "Refresh Data"}
      </button>
      {message && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{message}</span>
      )}
    </div>
  );
}
