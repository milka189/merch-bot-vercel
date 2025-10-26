import { sb, getPeriodStart, weekOfPeriod } from "./db.js";
import { InlineKeyboard } from "grammy";

type TTView = {
  tt_id: number;
  address: string;
  target: number;
  done: number;
  remaining: number;
};

export async function ensureUser(telegram_id: number, route_code: string) {
  const { error } = await sb.from("users").upsert({ telegram_id, route_code });
  if (error) throw error;
}

export async function currentWeek(): Promise<number> {
  const start = await getPeriodStart();
  return weekOfPeriod(new Date(), start);
}

export async function listForUser(telegram_id: number, week: number): Promise<TTView[]> {
  const { data: user, error: uerr } = await sb.from("users").select("*").eq("telegram_id", telegram_id).single();
  if (uerr) throw uerr;
  const route_code = (user as any).route_code as string;

  const { data: rows, error } = await sb
    .from("weekly_targets")
    .select("tt_id, target, tts:tt_id(id, address)")
    .eq("route_code", route_code)
    .eq("week", week);
  if (error) throw error;

  const ttIds = (rows || []).map(r => (r as any).tt_id);
  let doneByTt: Record<number, number> = {};
  if (ttIds.length) {
    const { data: prog, error: perr } = await sb
      .from("progress")
      .select("tt_id, done")
      .eq("telegram_id", telegram_id)
      .eq("week", week)
      .in("tt_id", ttIds);
    if (perr) throw perr;
    for (const p of (prog || []) as any[]) {
      doneByTt[p.tt_id] = p.done;
    }
  }

  const list: TTView[] = (rows || []).map((r: any) => {
    const done = doneByTt[r.tt_id] || 0;
    const remaining = Math.max(0, r.target - done);
    return { tt_id: r.tt_id, address: r.tts.address, target: r.target, done, remaining };
  });

  list.sort((a, b) => (b.remaining - a.remaining) || a.address.localeCompare(b.address));
  return list;
}

export function renderList(list: TTView[], week: number) {
  if (!list.length) {
    return "На эту неделю целей нет. Проверь код маршрута или дату периода.";
  }
  const lines = [`Неделя ${week}. Остатки по визитам:`];
  for (const item of list.slice(0, 20)) {
    lines.push(`• ${item.address} — осталось ${item.remaining} из ${item.target}`);
  }
  if (list.length > 20) {
    lines.push(`… и ещё ${list.length - 20} точек. Сузим позже кнопками.`);
  }
  return lines.join("\n");
}

export function keyboardFor(list: TTView[], week: number) {
  const kb = new InlineKeyboard();
  for (const item of list.slice(0, 20)) {
    const disabled = item.remaining <= 0;
    kb.text(disabled ? "✔️ Готово" : "Отметить визит", `mark:${item.tt_id}:${week}`).row();
  }
  kb.row().text("⟲ Обновить", `refresh:${week}`);
  return kb;
}

export async function markVisit(telegram_id: number, tt_id: number, week: number) {
  const { data: trow, error: terr } = await sb
    .from("weekly_targets")
    .select("target")
    .eq("tt_id", tt_id)
    .eq("week", week)
    .limit(1)
    .maybeSingle();
  if (terr) throw terr;
  const maxTarget = (trow?.target ?? 0) as number;

  const { data: prow, error: perr } = await sb
    .from("progress")
    .select("done")
    .eq("telegram_id", telegram_id)
    .eq("tt_id", tt_id)
    .eq("week", week)
    .maybeSingle();
  if (perr) throw perr;

  const newDone = Math.min(maxTarget, (prow?.done ?? 0) + 1);
  const { error: uerr } = await sb.from("progress").upsert({
    telegram_id, tt_id, week, done: newDone
  });
  if (uerr) throw uerr;
}
