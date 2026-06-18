// Helper for reading the local Supabase CLI stack's dev mailbox (Mailpit —
// the local-only mail catcher bundled by recent Supabase CLI versions under
// the legacy `[inbucket]` config key). Never points at a real mail server.
const MAILPIT_URL = 'http://127.0.0.1:54324'

interface MailpitMessageSummary {
  ID: string
}

export async function waitForEmail(
  to: string,
  { timeoutMs = 15_000, intervalMs = 500 } = {}
): Promise<{ html: string; text: string }> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)
    const data = (await res.json()) as { messages: MailpitMessageSummary[] }

    if (data.messages?.length > 0) {
      const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${data.messages[0].ID}`)
      const msg = (await msgRes.json()) as { HTML: string; Text: string }
      return { html: msg.HTML, text: msg.Text }
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`No email received for ${to} within ${timeoutMs}ms`)
}

export function extractFirstLink(html: string): string {
  const match = html.match(/href="([^"]+)"/)
  if (!match) throw new Error('No link found in email body')
  return match[1].replace(/&amp;/g, '&')
}
