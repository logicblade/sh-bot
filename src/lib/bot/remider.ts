import { bot } from "../..";
import type { DB } from "../../util/db";
import { Util } from "../../util/util";
import { getAllPanels } from "../panel/panel";

async function getExpiringClients(db: DB) {
  const panels = getAllPanels(db);

  const clientsDate: ExpiryCheckUser[] = [];
  const clientsTraffic: ExpiryCheckUser[] = [];

  for (const panel of panels) {
    const inbounds = await panel.getInbounds();

    if (inbounds) {
      const usersDate: ExpiryCheckUser[] = [];
      const usersTraffic: ExpiryCheckUser[] = [];

      for (const obj of inbounds.obj) {
        obj.settings.clients.forEach((client) => {
          const stat = obj.clientStats.find(
            (s) => s.uuid === client.id || s.email === client.email,
          );
          const used = (stat?.down ?? 0) + (stat?.up ?? 0);
          const remainingGB = client.totalGB - used;
          const now = Date.now();

          if (
            client.expiryTime - now <= Util.getUnixTimeOf({ days: 2 }) &&
            client.expiryTime !== 0 &&
            client.enable
          ) {
            usersDate.push({
              email: client.email,
              tgID: client.tgId || client.comment,
            });
          } else if (
            remainingGB <= Util.gigsToBytes(2) &&
            client.totalGB !== 0 &&
            client.enable
          ) {
            usersTraffic.push({
              email: client.email,
              tgID: client.tgId || client.comment,
            });
          }
        });
      }
    }
  }

  return { clientsDate, clientsTraffic };
}

export async function informUserExpiry(db: DB) {
  const { clientsDate, clientsTraffic } = await getExpiringClients(db);

  clientsDate.forEach((client) => {
    bot.bot.api.sendMessage(
      client.tgID,
      `
💡 کاربر گرامی
از سرویس اشتراک ${client.email} (کمتر از 2 روز) باقی مانده است. 
میتوانید از قسمت | تمدید اشتراک| 
اشتراک خود را تمدید کنید✅
        `,
    );
  });

  clientsTraffic.forEach((client) => {
    bot.bot.api.sendMessage(
      client.tgID,
      `
💡 کاربر گرامی
از سرویس اشتراک ${client.email} (کمتر از 2 گیگابایت) باقی مانده است. 
میتوانید از قسمت | تمدید اشتراک| 
اشتراک خود را تمدید کنید✅
        `,
    );
  });
}
