"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PencarianWilayah({
  defaultValue,
}: {
  defaultValue?: string;
}) {
  const [wilayah, setWilayah] = useState(defaultValue ?? "");
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = wilayah.trim();
    if (!trimmed) return;
    router.push(`/?wilayah=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor="wilayah-input" className="sr-only">
        Cari wilayah
      </label>
      <input
        id="wilayah-input"
        type="text"
        value={wilayah}
        onChange={(event) => setWilayah(event.target.value)}
        placeholder="Cari: Sleman, Bantul, Jakarta"
        aria-label="Masukkan nama wilayah"
        className="flex-1 min-w-0 rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        aria-label="Cari wilayah"
        className="shrink-0 rounded border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
      >
        Cari
      </button>
    </form>
  );
}
