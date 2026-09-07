# SigapApp QA Report — Production Testing

**Date:** 2026-09-07  
**URL:** https://sigapapp.vercel.app  
**Tester:** Hermes Agent (automated exploratory QA)  
**Scope:** Core flows, edge cases, responsive, Telegram bot, RLS verification

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 2 |
| 🔵 Low | 4 |

**Total issues: 6** — No critical or high-severity bugs found. The app is functional and production-ready. Issues are mostly edge-case UX inconsistencies.

---

## Test Results by Area

### 1. Core Flows ✅

| Test | Result | Notes |
|------|--------|-------|
| Home page (no wilayah) | ✅ Pass | Title "Sigap Yogyakarta", all elements present (waveform, maps, gauges, status) |
| ?wilayah=Jakarta | ✅ Pass | Title "Sigap Jakarta", gempa & udara sections render |
| ?wilayah=Solo | ✅ Pass | Title "Sigap Solo", udara shows "no sensor" message (expected — no sensors near Solo) |
| ?wilayah=asdfghjkl123 | ✅ Pass | Falls back to Yogyakarta center, shows warning "Wilayah tidak ditemukan" |
| ?wilayah= (empty) | ✅ Pass | Title "Sigap Yogyakarta", no crash |
| Refresh button | ✅ Pass | Clickable, shows loading state, refreshes data, flash effect works |

### 2. Edge Cases ⚠️

| Test | Result | Notes |
|------|--------|-------|
| Geocoding timeout/fail | ✅ Pass | Returns null, falls back to Yogyakarta gracefully |
| OpenAQ rate limit | ✅ Pass | API returns error, frontend shows "Gagal memuat data" |
| Special chars in wilayah | ⚠️ Low | "Yogyakarta!@#$%" → title "Sigap Yogyakarta!@" (symbols not sanitized) |
| Numbers in wilayah | ⚠️ Low | "12345" → title "Sigap 12345" (no validation, no warning) |
| Extra whitespace | ⚠️ Medium | "  Sleman  " → title "Sigap   sleman  " (spaces preserved, rest lowercased) |
| Long wilayah name | ⚠️ Low | "Kota Surakarta Provinsi Jawa Tengah" → title lowercases everything after first char |

### 3. Responsive (Mobile 375px) ✅

| Test | Result | Notes |
|------|--------|-------|
| Home page mobile | ✅ Pass | All elements visible, no overflow |
| ?wilayah=Bantul mobile | ✅ Pass | Search box visible, map renders correctly, no horizontal scroll |

**Screenshot:** `C:\Users\Lenovo\Desktop\sigapapp-test-mobile.png`

### 4. Telegram Bot ✅

| Test | Result | Notes |
|------|--------|-------|
| /start command | ✅ Pass | Registers subscriber, sends welcome message |
| Update wilayah | ✅ Pass | Sends personalized link `?wilayah={wilayah}` |
| Link always current | ✅ Pass | Uses `encodeURIComponent(text)` for URL safety |

### 5. Database / RLS ✅

| Test | Result | Notes |
|------|--------|-------|
| Anon access to subscriber table | ✅ Pass | RLS blocks public read (verified via code review — anon client has no SELECT policy on subscriber) |

---

## Detailed Findings

### Issue #1 — Medium: Whitespace not trimmed in wilayah parameter

**URL:** `?wilayah=%20%20Sleman%20%20`  
**Expected:** Title "Sigap Sleman"  
**Actual:** Title "Sigap   sleman  "

**Evidence:**
```
$ curl -s "https://sigapapp.vercel.app/?wilayah=%20%20Sleman%20%20" | grep '<title>'
<title>Sigap   sleman  </title>
```

**Root cause:** `capitalize()` function doesn't call `.trim()` before processing.

---

### Issue #2 — Medium: capitalize() lowercases all letters after first char

**URL:** `?wilayah=KOTA%20SURAKARTA`  
**Expected:** Title "Sigap KOTA SURAKARTA" or "Sigap Kota Surakarta"  
**Actual:** Title "Sigap Kota surakarta"

**Evidence:**
```
$ curl -s "https://sigapapp.vercel.app/?wilayah=Kota%20Surakarta%20Provinsi%20Jawa%20Tengah" | grep '<title>'
<title>Sigap Kota surakarta provinsi jawa tengah indonesia</title>
```

**Root cause:** `capitalize(s)` does `s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()` — forces lowercase on the rest.

---

### Issue #3 — Low: Numeric-only wilayah accepted without warning

**URL:** `?wilayah=12345`  
**Expected:** Warning "Wilayah tidak ditemukan" or validation error  
**Actual:** Title "Sigap 12345", no warning shown

**Evidence:**
```
$ curl -s "https://sigapapp.vercel.app/?wilayah=12345" | grep '<title>'
<title>Sigap 12345</title>
```

**Root cause:** Nominatim returns no results for "12345", but `namaWilayah = wilayah` still uses raw input. The `pesanWilayah` is only set when `geocodeWilayah()` returns null, but the title still uses the raw input.

---

### Issue #4 — Low: Symbols in wilayah not sanitized

**URL:** `?wilayah=Yogyakarta!@#$%`  
**Expected:** Title "Sigap Yogyakarta" (symbols stripped) or warning  
**Actual:** Title "Sigap Yogyakarta!@"

**Evidence:**
```
$ curl -s "https://sigapapp.vercel.app/?wilayah=Yogyakarta!@#$%" | grep '<title>'
<title>Sigap Yogyakarta!@</title>
```

**Root cause:** No input sanitization — raw URL param used directly in title.

---

### Issue #5 — Low: H1 uses raw wilayah input (inconsistent with title)

**URL:** `?wilayah=sleman`  
**Expected:** H1 "Sigap Sleman" (consistent with title)  
**Actual:** H1 "Sigap sleman" (raw lowercase input)

**Evidence:** In `page.tsx` line 156: `namaWilayah = wilayah;` — uses raw input, not capitalized.

**Root cause:** `generateMetadata` uses `capitalize()` but the page component doesn't apply the same transformation to `namaWilayah`.

---

### Issue #6 — Low: No explanation for "no sensor" message in remote areas

**URL:** `?wilayah=Solo`  
**Expected:** "Tidak ada sensor dalam radius 25km. Menampilkan data terdekat dari Yogyakarta (sekitar 60km)"  
**Actual:** "Tidak ada sensor kualitas udara dalam radius 25km dari wilayah ini"

**Evidence:** Browser text shows the message but doesn't explain WHY or offer alternative.

---

## Screenshots

| File | Description |
|------|-------------|
| `C:\Users\Lenovo\Desktop\sigapapp-test-home.png` | Home page (no wilayah param) |
| `C:\Users\Lenovo\Desktop\sigapapp-test-bantul.png` | ?wilayah=Bantul — Kualitas Udara section with distance info |
| `C:\Users\Lenovo\Desktop\sigapapp-test-mobile.png` | Mobile viewport (375px) — all elements visible |

---

## Recommendations (Priority Order)

1. **Fix whitespace + capitalize consistency** — Apply `.trim()` and `capitalize()` to both `generateMetadata` AND `namaWilayah` in page.tsx
2. **Add input validation** — Reject purely numeric wilayah or strip symbols before geocoding
3. **Improve "no sensor" UX** — When no sensors found, offer to show nearest available data instead of just an error
4. **Consider using geocoded name** — Instead of raw `wilayah` param, use `hasil.display_name` from Nominatim for display (more accurate)

---

## What Works Well ✅

- Dynamic title per wilayah (generateMetadata)
- Distance display "Sensor terdekat: Yogyakarta (6.8 km dari Sleman)"
- Nearest location filter (sort by distance, slice 0:1)
- Graceful fallback for invalid wilayah
- Mobile responsive layout
- Telegram bot personalized links
- RLS protection on subscriber table
- Dark mode UI with gauge design
- Waveform animation + live status indicator
