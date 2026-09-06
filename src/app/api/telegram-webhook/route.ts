import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const WELCOME_MESSAGE =
  "Selamat datang di SIGAP Bot! 🌍🔔\n\nSaya akan mengirimkan notifikasi:\n- Gempa dengan magnitudo ≥ 5.0\n- Kualitas udara (AQI) ≥ 150\n\nKirim nama wilayah yang ingin Anda pantau (contoh: Yogyakarta, Bandung, Jakarta). Anda bisa mengubah kapan saja.";

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  chat: TelegramChat;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Missing environment variable: TELEGRAM_BOT_TOKEN");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    console.error("Gagal mengirim pesan Telegram:", error);
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const requestSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (webhookSecret && requestSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseServerClient();

  if (text.startsWith("/start")) {
    const { error } = await supabase
      .from("subscriber")
      .upsert(
        { telegram_chat_id: String(chatId), updated_at: new Date().toISOString() },
        { onConflict: "telegram_chat_id" }
      );

    if (error) {
      console.error("Gagal mendaftarkan subscriber:", error.message);
    }

    await sendTelegramMessage(chatId, WELCOME_MESSAGE);
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/")) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("subscriber")
    .update({ wilayah: text, updated_at: new Date().toISOString() })
    .eq("telegram_chat_id", String(chatId));

  if (error) {
    console.error("Gagal memperbarui wilayah subscriber:", error.message);
  }

  await sendTelegramMessage(
    chatId,
    `Wilayah pemantauan Anda telah diperbarui ke "${text}". Anda akan menerima notifikasi gempa (M ≥ 5.0) dan kualitas udara (AQI ≥ 150) untuk wilayah ini.`
  );

  return NextResponse.json({ ok: true });
}
