import dotenv from "dotenv";
import { DB } from "./util/db";
import { TelBot } from "./lib/bot/bot";
import { ADMIN_ID } from "./lib/bot/helpers";
import nodeCron from "node-cron";
import { informUserExpiry } from "./lib/bot/remider";

dotenv.config({ quiet: true });

export const db = new DB();

export const bot = new TelBot(process.env.BOT_TOKEN!, db);

bot.bot.start();

bot.bot.catch(async (error) => {
  console.log(error);
  await bot.bot.api.sendMessage(
    ADMIN_ID,
    `
مشکلی پیش اومده:
${error.message}`,
  );
});

nodeCron.schedule(
  "0 22 * * *",
  () => {
    informUserExpiry(db);
  },
  {
    timezone: "Asia/Tehran",
  },
);

console.log("Running...");
