import { Bot, webhookCallback } from "grammy";
import { ensureUser, currentWeek, listForUser, renderList, keyboardFor, markVisit } from "../src/logic.js";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing");

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  await ctx.reply("Привет! Отправь код маршрута (например, ME-015). Например: \n`/route ME-015`", { parse_mode: "Markdown" });
});

bot.command("route", async (ctx) => {
  const parts = ctx.message?.text?.trim().split(/\s+/) ?? [];
  const route = parts[1];
  if (!route) {
    return ctx.reply("Пришли так: `/route КОД`", { parse_mode: "Markdown" });
  }
  await ensureUser(ctx.from!.id, route);
  await ctx.reply(`Готово. Твой маршрут: ${route}. Можешь ввести /week`);
});

bot.command("week", async (ctx) => {
  const w = await currentWeek();
  const list = await listForUser(ctx.from!.id, w);
  await ctx.reply(renderList(list, w), { reply_markup: keyboardFor(list, w) });
});

bot.on("callback_query:data", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data!;
    if (data.startsWith("mark:")) {
      const [, ttStr, wStr] = data.split(":");
      const tt = parseInt(ttStr, 10);
      const w = parseInt(wStr, 10);
      await markVisit(ctx.from!.id, tt, w);
      const list = await listForUser(ctx.from!.id, w);
      await ctx.editMessageText(renderList(list, w), { reply_markup: keyboardFor(list, w) });
    } else if (data.startsWith("refresh:")) {
      const [, wStr] = data.split(":");
      const w = parseInt(wStr, 10);
      const list = await listForUser(ctx.from!.id, w);
      await ctx.editMessageText(renderList(list, w), { reply_markup: keyboardFor(list, w) });
    }
    await ctx.answerCallbackQuery();
  } catch (e) {
    await ctx.answerCallbackQuery({ text: "Ошибка. Попробуйте ещё раз.", show_alert: false });
  }
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }
  const handle = webhookCallback(bot, "express");
  await handle(req, res);
}
