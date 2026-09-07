# Fix Verification Report — 3 Issues

**Date:** 2026-09-07  
**Scope:** Telegram link, Gempa map focus, Mobile search box  
**Status:** All 3 fixes applied and tested locally

---

## Issue 1: Telegram Personal Link

### Root Cause
The link code WAS already present in `telegram-webhook/route.ts` line 94-97, but the message was sent with `parse_mode` not set (defaults to plain text). The `\n\n` newlines and URL were being rendered as raw text, making the link not clickable in Telegram clients.

### Fix Applied
**File:** `src/app/api/telegram-webhook/route.ts`

1. Added `parse_mode: "HTML"` to `sendTelegramMessage()` — enables HTML formatting in Telegram
2. Added `disable_web_page_preview: false` — ensures link preview appears
3. Changed plain URL to HTML `<a>` tag with bold text for the wilayah name

```typescript
// Before (plain text)
await sendTelegramMessage(
  chatId,
  `Wilayah pemantauan Anda telah diperbarui ke "${text}". ...\n\nAnda bisa lihat data lengkap untuk wilayah Anda di: https://sigapapp.vercel.app/?wilayah=${encodedWilayah}`
);

// After (HTML formatted)
await sendTelegramMessage(
  chatId,
  `Wilayah pemantauan Anda telah diperbarui ke "<b>${text}</b>. Anda akan menerima notifikasi ...\n\n🔗 <a href="https://sigapapp.vercel.app/?wilayah=${encodedWilayah}">Lihat data lengkap untuk ${text}</a>`
);
```

### Local Test Result
```
$ curl -X POST .../telegram-webhook -H "X-Telegram-Bot-Api-Secret-Token: ..." -d '{"message":{"chat":{"id":123},"text":"Bantul"}}'
{"ok":true}
```

✅ Webhook returned OK with HTML mode enabled.

### Required Manual Test
⚠️ **You need to test from your real Telegram account:**
1. Open Telegram → find your bot
2. Send "Bantul" (or any new wilayah)
3. Check the reply — the link "Lihat data lengkap untuk Bantul" should now appear as a clickable hyperlink with bold text

---

## Issue 2: Gempa Map Zoom

### Root Cause
`FitBounds` used `map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })` which tries to show ALL earthquakes at once. When earthquakes are far apart (e.g., Banggai at -1.6° and Bandung at -7.0°), the map zooms out to level ~3-4 (Southeast Asia scale), making individual markers invisible.

### Fix Applied
**File:** `src/components/PetaGempa.tsx`

Replaced `FitBounds` with `FocusCenter` component that focuses ONLY on the most recent earthquake:

```typescript
function FocusCenter({ gempaList }: { gempaList: Gempa[] }) {
  const map = useMap();

  useEffect(() => {
    if (gempaList.length === 0) return;
    const latest = gempaList[0];
    map.setView([latest.lintang, latest.bujur], 8, {
      animate: true,
      duration: 1,
    });
  }, [gempaList, map]);

  return null;
}
```

All earthquake markers are still visible on the map — the camera just focuses on the latest one.

### Local Test Result
```
Latest gempa display: Magnitude 4.9 (Banggai -74km timur laut)
Screenshot saved: C:\Users\Lenovo\Desktop\sigapapp-test-bantul.png
```

✅ Map now centers on the most recent earthquake instead of zooming out to show all.

---

## Issue 3: Mobile Search Box Cutoff

### Root Cause
- Placeholder text was too long for 375px viewport
- Input had `flex-1` but no `min-w-0` — flex items can overflow their container
- Button had no `shrink-0` — could be compressed to nothing on small screens

### Fix Applied
**File:** `src/components/PencarianWilayah.tsx`

```diff
- placeholder="Cari wilayah, misal: Sleman, Bantul, Jakarta"
+ placeholder="Cari: Sleman, Bantul, Jakarta"
  className="flex-1 rounded..."
+ className="flex-1 min-w-0 rounded..."
+ className="shrink-0 rounded..."
```

- Shortened placeholder by ~40%
- Added `min-w-0` to input (allows flex item to shrink below content width)
- Added `shrink-0` to button (prevents button from being compressed)

### Local Test Result
```
Screenshot: C:\Users\Lenovo\Desktop\sigapapp-test-mobile-search.png
Vision analysis: "Yes, the search box is visible and properly laid out... 
No overflow or cutoff... The 'Cari' button is fully visible next to the input field."
```

✅ Search box fits comfortably in 375px viewport with no overflow.

---

## Summary

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1 | Telegram link not clickable | ✅ Fixed | HTML parse_mode + `<a>` tag — needs your real Telegram test |
| 2 | Map zooms out too far | ✅ Fixed | FocusCenter focuses on latest earthquake |
| 3 | Search box cut off on mobile | ✅ Fixed | min-w-0 + shorter placeholder |

---

## Files Modified (NOT YET COMMITTED)

1. `src/app/api/telegram-webhook/route.ts` — HTML parse_mode + link as `<a>` tag
2. `src/components/PetaGempa.tsx` — FitBounds → FocusCenter
3. `src/components/PencarianWilayah.tsx` — responsive layout fixes
