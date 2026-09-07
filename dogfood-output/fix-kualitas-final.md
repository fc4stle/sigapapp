# Laporan Bug — Fix Kualitas Udara

## Ringkasan Temuan

| # | Masalah | Status | Bukti |
|---|---------|--------|-------|
| 1 | Sentinel -999 ditampilkan | ✅ Fixed | Filter `isValidMeasurement()` di API |
| 2 | Legend warna terpotong/hilang | ✅ Diperbaiki | Legend position absolute + parent relative |
| 3 | Popup marker kurang informatif | ✅ Ditambahkan | Status AQI di popup |
| 4 | Konteks section kurang | ✅ Ditambahkan | Teks "diperbarui berkala" |

---

## 1. Sentinel Value Filter

### Masalah
OpenAQ return -999.0 untuk data tidak valid (sensor error).

### Solusi
Di `src/app/api/kualitas-udara/route.ts` dan `src/app/api/fetch-kualitas-udara/route.ts`:

```typescript
const SENTINEL_THRESHOLD = -900;

function isValidMeasurement(value: number): boolean {
  return value >= SENTINEL_THRESHOLD;
}

// Skip sentinel values
if (!isValidMeasurement(result.value)) {
  console.log(`SKIP sentinel: ${result.value}`);
  continue;
}
```

### DB Check
```
value = -999: 0 rows
Total rows: 11 (all valid)
```

✅ Database bersih.

---

## 2. Legend Warna Terpotong

### Masalah
- Container peta `div.relative` tapi legenda position absolute bottom-4 left-4 terpotong di viewport mobile
- Z-index Leaflet tile lebih tinggi dari legend

### Solusi
Di `src/components/PetaKualitasUdara.tsx`:

```tsx
{dataList.length > 0 && <Legend />}
```

CSS Tailwind: `absolute bottom-4 left-4 z-[1000]` dengan background `bg-background/90`.

---

## 3. Popup Marker Informatif

### Popup sekarang menampilkan:
- Nama lokasi
- Parameter: value + unit
- Status: Baik/Sedang/Tidak sehat/Bahaya (berdasarkan PM2.5 scale)
- Timestamp

---

## 4. Konteks Section

Tambahkan teks:
> "Data kualitas udara dari sensor pemantauan terdekat, diperbarui berkala"

---

## Files Modified

1. `src/app/api/kualitas-udara/route.ts` — sentinel filter
2. `src/app/api/fetch-kualitas-udara/route.ts` — sentinel filter + fix imports
3. `src/components/PetaKualitasUdara.tsx` — legend fix + popup + status label
4. `src/components/KualitasUdaraSection.tsx` — konteks teks

## Screenshots

- `sigapapp-test-kualitas-udara.png` — section dengan gauge
- `sigapapp-check5.png` — section dengan marker

## Tindakan Selanjutnya

- Review & approve
- Commit + push + deploy
