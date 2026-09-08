# SIGAP — Sistem Peringatan Dini Gempa & Kualitas Udara

Aplikasi web yang memantau data gempa bumi dan kualitas udara di Indonesia secara real-time, dengan sistem notifikasi otomatis melalui Telegram.

**Live:** [www.sigapindonesia.web.id](https://www.sigapindonesia.web.id)

---

## Latar belakang

Indonesia berada di kawasan rawan gempa (Cincin Api Pasifik) dan menghadapi masalah kualitas udara yang bervariasi antar wilayah, mulai dari polusi perkotaan hingga kabut asap kebakaran hutan. Informasi mengenai kedua hal ini sering tersebar di berbagai sumber resmi (BMKG, OpenAQ, KLHK) tanpa ada satu tempat yang menggabungkan, menyederhanakan, dan mengaktifkan peringatan otomatis untuk masyarakat umum.

SIGAP dibangun untuk menjawab kebutuhan itu — mengagregasi data dari sumber resmi, menyajikannya dengan bahasa yang mudah dipahami orang awam, dan mengirim notifikasi otomatis ke wilayah yang dipilih pengguna.

Proyek ini selaras dengan SDG 11 (Sustainable Cities and Communities) — khususnya target 11.5 tentang pengurangan dampak bencana — dan SDG 13 (Climate Action) terkait mitigasi dan peringatan dini.

---

## Fitur utama

- Data gempa real-time dari BMKG, ditampilkan di peta interaktif dengan detail magnitude, kedalaman, lokasi, dan waktu kejadian.
- Data kualitas udara dari dua sumber: OpenAQ (jaringan sensor global) dan ISPU KLHK (jaringan sensor resmi pemerintah Indonesia), digabung untuk memperluas cakupan wilayah.
- Pencarian wilayah — pengguna bisa mencari nama daerah mana pun di Indonesia; sistem melakukan geocoding dan menampilkan data gempa dan kualitas udara terdekat, lengkap dengan jarak dari sensor.
- Kartu ringkasan status — satu kalimat sederhana ("Aman untuk beraktivitas" / "Perlu diwaspadai" / dst) yang langsung menjawab kondisi wilayah tanpa perlu membaca angka teknis.
- Grafik tren historis — perubahan magnitude gempa dan kadar PM2.5 dari waktu ke waktu, dengan pilihan rentang 24 jam atau 7 hari.
- Notifikasi Telegram — pengguna mendaftarkan wilayah pantauannya lewat bot Telegram, dan menerima notifikasi otomatis saat ada gempa signifikan (magnitude >= 5.0) atau kualitas udara memburuk (AQI >= 150) di wilayah tersebut, lengkap dengan tautan langsung ke halaman wilayah itu.
- Mode aksesibilitas — toggle untuk memperbesar ukuran teks dan menaikkan kontras warna, ditujukan untuk lansia dan pengguna difabel, mengikuti standar WCAG 2.1 AA.
- Pembaruan otomatis — data disegarkan otomatis setiap hari lewat cron job, dengan opsi refresh manual kapan saja.

---

## Sumber data

| Sumber | Data | Cakupan | Sifat |
|---|---|---|---|
| BMKG (data.bmkg.go.id) | Gempa bumi terkini | Nasional (1 gempa terbaru) | API resmi, publik |
| OpenAQ (openaq.org) | PM2.5, PM10, PM1, suhu, kelembapan | Terbatas, kota-kota tertentu | API resmi, perlu API key |
| ISPU KLHK | PM10, PM2.5, SO2, CO, O3, NO2 dengan kategori ISPU nasional | Sekitar 119 stasiun se-Indonesia | Endpoint tidak resmi (ditemukan lewat analisis jaringan aplikasi ISPU), berpotensi berubah sewaktu-waktu |

Catatan jujur soal keterbatasan data: cakupan sensor kualitas udara di Indonesia masih jarang di luar kota besar. Untuk wilayah yang tidak memiliki sensor dalam radius pencarian, aplikasi menampilkan pesan yang transparan alih-alih data yang menyesatkan.

---

## Arsitektur dan cara kerja

Alur data: BMKG / OpenAQ / ISPU -> Cron harian -> Supabase (PostgreSQL) -> Next.js API Routes -> Frontend, dengan Notification Engine yang memanggil Telegram Bot API setiap ada data baru.

1. Extract — cron job harian (dan tombol refresh manual) memanggil API BMKG, OpenAQ, dan ISPU, menyimpan hasilnya ke database.
2. Notify — setiap data baru dicek terhadap ambang batas tiap subscriber; jika terlampaui, notifikasi dikirim via Telegram Bot API (dengan penanda notified_at untuk mencegah notifikasi duplikat).
3. Serve — frontend mengambil data dari database sendiri (bukan langsung dari API pihak ketiga), sehingga tetap responsif meski sumber data eksternal sedang lambat/down.
4. Personalisasi wilayah — saat pengguna mencari wilayah, sistem melakukan geocoding (Nominatim/OpenStreetMap), menghitung jarak ke sensor terdekat, dan menyesuaikan tampilan peta serta urutan data gempa berdasarkan jarak tersebut.

---

## Tumpukan teknologi

- Frontend dan backend: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Database: Supabase (PostgreSQL) dengan Row Level Security
- Peta: Leaflet.js dan OpenStreetMap
- Hosting: Vercel (dengan Vercel Cron untuk penjadwalan)
- Notifikasi: Telegram Bot API
- Font: IBM Plex Sans dan IBM Plex Mono

---

## Struktur proyek (ringkas)

- src/app/page.tsx — Halaman utama
- src/app/api/fetch-gempa/ — Cron: ambil dan simpan data gempa
- src/app/api/fetch-kualitas-udara/ — Cron: ambil dan simpan data OpenAQ
- src/app/api/kualitas-udara/ — Endpoint dinamis untuk pencarian wilayah
- src/app/api/ispu/ — Endpoint data ISPU KLHK
- src/app/api/geocode/ — Geocoding nama wilayah ke koordinat
- src/app/api/telegram-webhook/ — Webhook bot Telegram
- src/components/PetaGempa.tsx, PetaKualitasUdara.tsx, RingkasanStatus.tsx, PencarianWilayah.tsx, GempaTrendChart.tsx, KualitasUdaraTrendChart.tsx
- src/lib/supabase-anon.ts, geocode.ts, telegram-notify.ts, format-wilayah.ts

---

## Menjalankan secara lokal

Clone repo, install dependency dengan npm install, buat file .env.local dengan variabel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAQ_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, CRON_SECRET, ISPU_ENABLED=true. Jalankan npm run dev, buka http://localhost:3000.

---

## Status pengembangan

| Fase | Cakupan | Status |
|---|---|---|
| 1 | Fondasi — fetch data gempa, database | Selesai |
| 2 | Peta interaktif, kualitas udara | Selesai |
| 3 | Sistem notifikasi Telegram | Selesai |
| 4 | Redesign UI, aksesibilitas, grafik tren | Selesai |
| Tambahan | Pencarian wilayah, integrasi ISPU, domain resmi | Selesai |

Proyek dikembangkan sebagai bagian dari tugas kuliah Praktik Aplikasi Web / Praktik Desain Web, dengan target penyelesaian awal Desember 2026.

---

## Keterbatasan yang diketahui

- Data gempa dari BMKG bersifat nasional (bukan per-wilayah) — hanya menampilkan 1 gempa terbaru se-Indonesia setiap kali di-fetch. List gempa diurutkan berdasarkan jarak dari wilayah yang dicari, tetapi datanya tetap gempa nasional, bukan gempa lokal wilayah tersebut.
- Endpoint ISPU KLHK tidak resmi/tidak terdokumentasi — berpotensi berubah atau berhenti berfungsi tanpa pemberitahuan. Fitur ini dilengkapi feature flag untuk dinonaktifkan cepat jika diperlukan.
- Cron job berjalan sekali sehari (batasan paket gratis Vercel Hobby), sehingga grafik tren historis membutuhkan waktu untuk terisi data yang cukup.

---

## Pengembang

Dikembangkan oleh Alysa — mahasiswa Program Studi Teknologi Informasi, Universitas Negeri Yogyakarta.
