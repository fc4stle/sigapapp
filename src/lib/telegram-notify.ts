interface SendTelegramMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

/**
 * Sends a message to a Telegram chat via the Bot API.
 * Never throws — logs and returns false on failure so callers can loop over
 * many subscribers without one bad chat_id aborting the rest.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendTelegramMessageOptions = {}
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Missing environment variable: TELEGRAM_BOT_TOKEN");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? "HTML",
      }),
    });

    if (!response.ok) {
      console.error("Telegram API merespons dengan status", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Gagal mengirim pesan Telegram:", error);
    return false;
  }
}
