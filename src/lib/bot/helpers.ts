import { type Context, InlineKeyboard } from "grammy";
import {
  bigGreet,
  justImageTxt,
  noSubFoundTxt,
  reciptReceiveTxt,
  searchingTxt,
  statusEnabledTxt,
  statusNotStartedtxt,
  statusOffTxt,
  subFoundTxt,
  welcomeAdminTxt,
} from "./messages";
import { adminMenu, mainMenu, renewMenu } from "./keyboards";
import type { DB } from "../../util/db";
import type { Conversation } from "@grammyjs/conversations";
import { db } from "../..";
import { getAllPanels } from "../panel/panel";
import { Util } from "../../util/util";

export const ADMIN_ID = Number(process.env.ADMIN_ID!);
export const renewCache: Record<number, UserConfig[]> = {};

export const waitingForRenewImage = new Set<number>();
export const pendingRenewals = new Map<number, { photoFileID: string }>();
export const pendingConfig = new Map<number, PendingConfig>();
export const pendingConfigType = new Map<number, ConfigPrice>();

const replyToAdmin = async (ctx: Context, msg: string) => {
  return await ctx.api.sendMessage(ADMIN_ID, msg, { reply_markup: adminMenu });
};

export async function handleStartCommandForUser(ctx: Context, db: DB) {
  const init = db.getPanels().length !== 0;
  if (!init) {
    await ctx.reply("ربات هنوز توسط ادمین راه اندازی نشده است...", {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }
  await ctx.reply(bigGreet, { reply_markup: mainMenu });
}

export async function handleImagesIncome(ctx: Context) {
  const userID = ctx.from?.id!;
  if (!ctx.message?.photo) {
    waitingForRenewImage.delete(userID);
    pendingConfig.delete(userID);
    await ctx.reply(justImageTxt, { reply_markup: mainMenu });
    return;
  } else {
    const photo = ctx.message.photo.at(-1);
    if (!photo) return;

    waitingForRenewImage.delete(userID);

    pendingRenewals.set(userID, { photoFileID: photo.file_id });

    const uuid = pendingConfig.get(userID)?.UUID!;
    const configs = renewCache[userID]?.filter(
      (v) =>
        (v.isRenewable && v.uuid === uuid) ||
        (v.status === false && v.uuid === uuid),
    );
    const email = Util.removeEmoji(configs?.at(0)?.email!);
    const type = pendingConfigType.get(userID)!;

    await ctx.api.sendPhoto(ADMIN_ID, photo.file_id, {
      caption: `درخواست تمدید از طرف کاربر\n${userID}\n\n${email}\n${type}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ قبول", callback_data: `renewAccept:${userID}` },
            { text: "❌ رد", callback_data: `renewDecline:${userID}` },
          ],
        ],
      },
    });

    await ctx.reply(reciptReceiveTxt, { reply_markup: mainMenu });
    return;
  }
}

export const handleRenewCallback = async (ctx: Context) => {
  const index = Number(ctx.callbackQuery?.data?.replace("renew:", ""));
  const userID = ctx.from?.id!;

  const configs = renewCache[userID];
  if (!configs) return;

  const selected = configs[index];

  await ctx.deleteMessage();

  if (selected?.status && !selected.isRenewable) {
    await ctx.reply(statusEnabledTxt);
    await ctx.answerCallbackQuery();
    return;
  } else if (!selected?.hasStarted) {
    await ctx.reply(statusNotStartedtxt);
    await ctx.answerCallbackQuery();
    return;
  } else if (selected.isOff) {
    await ctx.reply(statusOffTxt);
    await ctx.answerCallbackQuery();
    return;
  } else {
    pendingConfig.set(userID, {
      UUID: selected?.uuid!,
      inboundID: selected?.inboundID!,
    });
  }

  await ctx.reply(
    `لطفا نوع اشتراک خود را انتخاب کنید:

چنانچه نیاز به اشتراک با حجم بیشتر دارید، با پشتیبانی تماس بگیرید 👇

🆔: @foxngsup`,
    {
      reply_markup: renewMenu,
    },
  );

  await ctx.answerCallbackQuery();
};

export const handleRenewDeclineCallback = async (ctx: Context) => {
  const adminId = ctx.from?.id!;
  if (adminId !== ADMIN_ID)
    return await ctx.answerCallbackQuery({ text: "Not allowed" });

  const userId = Number(ctx.callbackQuery?.data!.replace("renewDecline:", ""));
  const pending = pendingRenewals.get(userId);
  if (!pending)
    return await ctx.answerCallbackQuery({ text: "No pending request" });

  pendingRenewals.delete(userId);
  pendingConfig.delete(userId);
  pendingConfigType.delete(userId);

  await ctx.api.sendMessage(
    userId,
    `‼️رسید پرداخت شما توسط ادمین رد شد‼️

با آیدی پشتیبانی در ارتباط باشید👇🏼

🆔: @foxngsup`,
  );
  await ctx.reply("رد شد ❌");
  await ctx.answerCallbackQuery();
};

export async function handleRenewAccount(ctx: Context, db: DB) {
  const looking = await ctx.reply(searchingTxt);

  const panels = getAllPanels(db);
  let configs: UserConfig[] = [];

  for (const panel of panels) {
    const config = await panel.getUserConfig(ctx.from?.id!);
    if (config) {
      config.forEach((conf) => configs.push(conf));
    }
  }

  await ctx.api.deleteMessage(ctx.from?.id!, looking.message_id);
  if (configs.length === 0) {
    await ctx.reply(noSubFoundTxt);
  } else {
    const keyboard = new InlineKeyboard();

    configs.forEach((config, idx) => {
      keyboard.text(config.email, `renew:${idx}`).row();
    });

    renewCache[ctx.from?.id!] = configs;

    await ctx.reply(subFoundTxt, {
      reply_markup: keyboard,
    });
  }
}

export async function handleCheckAccount(ctx: Context, db: DB) {
  const looking = await ctx.reply(searchingTxt);

  const panels = getAllPanels(db);
  let configs: UserConfig[] = [];

  for (const panel of panels) {
    const config = await panel.getUserConfig(ctx.from?.id!);
    if (config) {
      config.forEach((conf) => configs.push(conf));
    }
  }

  await ctx.api.deleteMessage(ctx.from?.id!, looking.message_id);
  if (configs.length === 0) {
    await ctx.reply(noSubFoundTxt);
  } else {
    let statusTxt = "🔋وضعیت حساب شما:\n\n";

    for (const conf of configs) {
      console.log(conf.status);
      console.log(conf.inboundID);

      const email = Util.removeEmoji(conf.email);
      statusTxt += `${conf.status ? (conf.isRenewable ? "🟡" : "🟢") : "🔴"} ${email} - ${conf.status ? (conf.isRenewable ? "نزدیک انقضا" : "فعال") : "به اتمام رسیده"}\n`;
    }

    await ctx.reply(statusTxt);
  }
}

export async function handleStartCommandForAdmin(ctx: Context, db: DB) {
  const init = db.getPanels().length !== 0;
  if (!init) {
    await replyToAdmin(ctx, welcomeAdminTxt);
  } else {
    await replyToAdmin(ctx, "سلام گل!");
  }
}

export async function showPanelsListToAdmin(ctx: Context, db: DB) {
  const looking = (await replyToAdmin(ctx, searchingTxt)).message_id;

  const credentials = db.getPanels();
  await ctx.api.deleteMessage(ADMIN_ID, looking);
  let msg = "پنل های شما:\n";

  if (credentials.length === 0) {
    msg = "هیچی نداریم که!";
    await replyToAdmin(ctx, msg);
    return;
  }

  credentials.forEach(
    (cert) =>
      (msg += `
Name: ${cert.name}
URL: ${cert.url}

    `),
  );

  await replyToAdmin(ctx, msg);
}

export async function addPanelConv(conversation: Conversation, ctx: Context) {
  await ctx.reply(`
خب آدرس پنل رو بده بهم:

هر موقع که خواستی بیخیال بشی هم میتونی بنویسی بیخیال
`);
  const { message: url } = await conversation.waitFor("message:text");
  if (url.text === "بیخیال") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }
  await ctx.reply("یه اسم خاص به این پنل بده:");
  const { message: name } = await conversation.waitFor("message:text");
  if (name.text === "بیخیال") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }
  await ctx.reply("حالا یوزرنیم:");
  const { message: username } = await conversation.waitFor("message:text");
  if (username.text === "بیخیال") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }
  await ctx.reply("حالام پسورد:");
  const { message: password } = await conversation.waitFor("message:text");
  if (password.text === "بیخیال") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }

  db.addPanel(url.text.toLowerCase(), name.text, username.text, password.text);

  await ctx.reply("تمام است!");
}

export async function removePanelConv(
  conversation: Conversation,
  ctx: Context,
) {
  await ctx.reply("خب صد درصد میخوای شروع کنیم؟ اگه آره که بگو آره");
  const { message: confirm1 } = await conversation.waitFor("message:text");
  if (confirm1.text !== "آره") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }
  await ctx.reply(`
بسیارخب
اسم پنلی که میخوای پاک کنی رو دقیق بهم بگو:

البته اگه بگی بیخیال منم بیخیال میشم.
    `);
  const { message: name } = await conversation.waitFor("message:text");
  if (name.text === "بیخیال") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }
  await ctx.reply("صد درصد؟ پاک کنم دیگه برنمیگرده");
  const { message: confirm2 } = await conversation.waitFor("message:text");
  if (confirm2.text !== "آره") {
    await ctx.reply("اوکی کار کنسله");
    return;
  }

  const deleted = db.deletePanelByName(name.text);

  if (deleted) {
    ctx.reply(`تمومه
پنل ${name.text} از لیست پاک شد`);
    return;
  } else {
    ctx.reply("مشکلی پیش اومده پنل پاک نشد");
    return;
  }
}
export async function getConfigsPanel(uuid: string, db: DB) {
  const panels = getAllPanels(db);

  for (const panel of panels) {
    const inbounds = await panel.getInbounds();
    if (inbounds) {
      for (const bound of inbounds.obj) {
        for (const client of bound.clientStats) {
          if (client.uuid === uuid) {
            return panel;
          }
        }
      }
    }
  }
}
