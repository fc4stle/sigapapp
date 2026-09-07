# ISPU KLHK Integration Notes

## Status: ⚠️ Development (ISPU_ENABLED=false by default)

## Source

Endpoint ditemukan melalui reverse-engineering web app publik KLHK di `ispu.kemenlh.go.id/webv5/`. Kode JS (`main.daf7c0ad3ad4bfd4.js`) mengandung base URL dan pola pemanggilan API.

**Temuan kunci:**
- Base URL: `https://ispu.kemenlh.go.id/`
- Endpoint utama: `GET /apimobile/v1/getStations`
- Endpoint detail: `GET /apimobile/v1/getDetail/stasiun/{id_stasiun}`
- Tidak ada autentikasi — endpoint publik
- Respon: JSON `{ rows: IspuStation[], status: { statusCode, statusDesc }, total: number }`

## Risiko

| Risiko | Impact | Mitigasi |
|--------|--------|----------|
| Endpoint berubah/dihapus | Data ISPU hilang | Fallback ke OpenAQ, feature flag bisa dimatikan instant |
| Format data berubah | Parsing error | Try-catch + return empty array, page tetap jalan |
| Rate limiting | Request diblokir | Timeout 5s, max 5 stasiun ditampilkan, cache sisi server bisa ditambahkan |
| Data tidak akurat (maintenance) | Stasiun maintenance tampil | Filter `is_maintenance === "0"` sebelum display |
| Anomali nilai (polusi ekstrem) | ISPU value sangat tinggi | Tampilkan apa adanya dengan label kategori, tidak di-convert |

## Cara Non-aktifkan Cepat

Set env var `ISPU_ENABLED=false` di Vercel dashboard, lalu redeploy. Atau lebih cepat: revert commit yang menambah endpoint.

Atau matikan di runtime via API route response — endpoint tetap ada tapi return empty.

## Mapping Data

### Prinsip
- **JANGAN** konversi ISPU ke PM2.5 atau sebaliknya — dua sistem berbeda metodologi
- Tampilkan keduanya terpisah dengan badge sumber ("Sumber: KLHK" vs "Sumber: OpenAQ")
- Gunakan warna marker berbeda (border style) untuk visual distinction

### Kategori ISPU (langsung dari KLHK, tidak dihitung ulang)

| Kategori ISPU | Nilai Range | Warna | Border Style |
|---------------|-------------|-------|--------------|
| BAIK | 0-50 | `#22c55e` (hijau) | solid |
| TIDAK SEHAT | 51-100 | `#eab308` (kuning) | solid |
| SANGAT TIDAK SEHAT | 101-200 | `#f97316` (orange) | solid |
| BERBAHAYA | >200 | `#ef4444` (merah) | solid |

### Kategori OpenAQ (existing)

| PM2.5 (µg/m³) | Label | Warna |
|----------------|-------|-------|
| ≤12 | Baik | `#22c55e` |
| 12-35 | Sedang | `#eab308` |
| 35-55 | Tidak sehat | `#f97316` |
| >55 | Bahaya | `#ef4444` |

### Visual Distinction di Peta

Sumber KLHK: border **solid** (sekarang)
Sumber OpenAQ: border **dashed** (nantinya, setelah integrasi map)

Atau sebaliknya — selama konsisten dan legend menyebutkan.

## Konversi Waktu

ISPU menyimpan waktu lokal dengan zona waktu eksplisit:
- Format: `2026-09-08 05:00:00`
- Timezone: `WIB` (+7), `WITA` (+8), `WIT` (+9)
- Field `time_offset`: 0, 1, 2 (sesuai urutan di atas)

Konversi ke UTC: parse sebagai waktu lokal tersebut, lalu kurangi offset jam.

## Parameter yang Diekstrak

Dari data ISPU, hanya ambil parameter ini (skip HC karena tidak ada standar konversi):
- PM10 (µg/m³)
- PM2.5 (µg/m³)
- SO2 (µg/m³)
- CO (mg/m³)
- O3 (µg/m³)
- NO2 (µg/m³)

## Feature Flag

Env var: `ISPU_ENABLED` (string)
- `"true"`: endpoint aktif, fetch dari KLHK
- `"false"` (default): endpoint return `ispu_active: false` + pesan

## File Terkait

- `src/lib/ispu-client.ts` — fungsi fetch & filter
- `src/app/api/ispu/route.ts` — API endpoint

## Kapan Mengaktifkan di Production

Setelah:
1. Build sukses & deploy
2. Test endpoint `/api/ispu?lat=...&lon=...` return data
3. Verifikasi tidak ada error di Vercel function logs
4. Pastikan legend UI memperlihatkan kedua sumber

Set `ISPU_ENABLED=true` di Vercel Env Vars → redeploy.
