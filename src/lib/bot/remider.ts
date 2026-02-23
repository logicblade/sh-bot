import { bot } from "../..";
import type { DB } from "../../util/db";
import { Util } from "../../util/util";
import { getAllPanels } from "../panel/panel";

async function getExpiringClients(db: DB) {
  const panels = getAllPanels(db);

  const clients: ExpiryCheckUser[] = [];

  for (const panel of panels) {
    const inbounds = await panel.getInbounds();

    if (inbounds) {
      const users: ExpiryCheckUser[] = [];

      for (const obj of inbounds.obj) {
        obj.settings.clients.forEach((client) => {
          const stat = obj.clientStats.find(
            (s) => s.uuid === client.id || s.email === client.email,
          );
          const used = (stat?.down ?? 0) + (stat?.up ?? 0);
          const remainingGB = client.totalGB - used;
          const now = Date.now();

          if (
            (client.expiryTime - now <= Util.getUnixTimeOf({ days: 3 }) &&
              client.expiryTime !== 0 &&
              client.enable) ||
            (remainingGB <= Util.gigsToBytes(3) &&
              client.totalGB !== 0 &&
              client.enable)
          ) {
            users.push({
              email: client.email,
              tgID: client.tgId || client.comment,
            });
          }
        });
      }
    }
  }

  return clients;
}

export async function informUserExpiry(db: DB) {
  const clients = await getExpiringClients(db);

  clients.forEach((client) => {
    bot.bot.api.sendMessage(
      client.tgID,
      `
💡 کاربر گرامی
از سرویس اشتراک ${client.email} (کمتر از 3 روز) باقی مانده است. 
میتوانید از قسمت | تمدید اشتراک| 
اشتراک خود را تمدید کنید✅
        `,
    );
  });
}
