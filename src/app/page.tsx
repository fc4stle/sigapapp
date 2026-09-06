import { createSupabaseAnonClient } from "@/lib/supabase-anon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createSupabaseAnonClient();
  const { data: gempaList, error } = await supabase
    .from("gempa")
    .select("magnitude, wilayah, tanggal, jam")
    .order("date_time", { ascending: false });

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 py-16 px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Data Gempa Terkini
        </h1>

        {error ? (
          <p className="text-red-600 dark:text-red-400">
            Gagal memuat data gempa: {error.message}
          </p>
        ) : !gempaList || gempaList.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Belum ada data gempa
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {gempaList.map((gempa, index) => (
              <li
                key={index}
                className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <p className="text-xl font-semibold text-black dark:text-zinc-50">
                  Magnitude {gempa.magnitude}
                </p>
                <p className="text-zinc-700 dark:text-zinc-300">
                  {gempa.wilayah}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {gempa.tanggal}, {gempa.jam}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
