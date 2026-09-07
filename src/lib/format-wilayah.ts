const SIMBOL_DIIZINKAN = /[^a-zA-Z0-9\s-]/g;
const SEMUA_ANGKA = /^\d+$/;

export interface WilayahTervalidasi {
  nama: string;
  valid: boolean;
  pesan: string | null;
}

export function validasiWilayah(input: string): WilayahTervalidasi {
  const trimmed = input.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return { nama: "", valid: false, pesan: "Nama wilayah tidak boleh kosong" };
  }

  if (SEMUA_ANGKA.test(trimmed)) {
    return { nama: trimmed, valid: false, pesan: "Nama wilayah tidak boleh murni angka" };
  }

  const namaBersih = trimmed.replace(SIMBOL_DIIZINKAN, "");
  const namaTrimmed = namaBersih.trim().replace(/\s+/g, " ");

  if (!namaTrimmed) {
    return { nama: trimmed, valid: false, pesan: "Nama wilayah tidak valid" };
  }

  return { nama: namaTrimmed, valid: true, pesan: null };
}

export function capitalize(s: string): string {
  return s
    .split(" ")
    .map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1).toLowerCase())
    .join(" ");
}
