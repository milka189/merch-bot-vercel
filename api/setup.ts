export default async function handler(req: any, res: any) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: "BOT_TOKEN missing" });
    return;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = `${proto}://${host}/api/telegram`;
  const api = `https://api.telegram.org/bot${token}/setWebhook`;
  const r = await fetch(`${api}?url=${encodeURIComponent(url)}`);
  const j = await r.json();
  res.status(200).json(j);
}
