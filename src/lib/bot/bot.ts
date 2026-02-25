import { Bot, Context, Keyboard } from "grammy";
import { DB } from "../../util/db";
import {
  addPanelConv,
  ADMIN_ID,
  genConfig,
  getConfigCache,
  getConfigsPanel,
  handleCheckAccount,
  handleCreateAccount,
  handleCreateDeclineCallback,
  handleGetConfig,
  handleImagesIncome,
  handleRenewAccount,
  handleRenewCallback,
  handleRenewDeclineCallback,
  handleStartCommandForAdmin,
  handleStartCommandForUser,
  pendingConfig,
  pendingConfigType,
  pendingCreateConfig,
  pendingCreateConfigType,
  pendingCreates,
  pendingRenewals,
  removePanelConv,
  renewCache,
  showPanelsListToAdmin,
  state,
  waitingForCreateImage,
  waitingForRenewImage,
} from "./helpers";
import {
  buySubBtn,
  tutorialBtnTxt,
  myPanelsBtn,
  addPanelBtn,
  deletePanelBtn,
  renewSubBtn,
  mySubBtn,
  cancelBtn,
  greet,
  oneM40G,
  oneM80G,
  renewTxt250,
  renewTxt450,
  resetBtn,
  contactTxt,
  buyTxt250,
  buyTxt450,
  disableSellTxt,
  disableRenewTxt,
  appStateBtn,
  changeSellStateBtn,
  changeRenewStateBtn,
  getConfigBtn,
} from "./messages";
import {
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { mainMenu } from "./keyboards";
import { Util } from "../../util/util";
import { getAllPanels } from "../panel/panel";
import { WHICH_INBOUND, WHICH_PANEL } from "../..";

export const creatingEmail = new Map<number, string>();

export class TelBot {
  bot: Bot<ConversationFlavor<Context>>;

  constructor(token: string, db: DB) {
    this.bot = new Bot<ConversationFlavor<Context>>(token);

    this.bot.use(conversations());
    this.bot.use(createConversation(addPanelConv));
    this.bot.use(createConversation(removePanelConv));

    this.bot.command("start", async (ctx) => {
      if (ctx.from?.id === ADMIN_ID) {
        await handleStartCommandForAdmin(ctx, db);
      } else {
        await handleStartCommandForUser(ctx, db);
      }
    });

    this.bot.on("message", async (ctx) => {
      const userID = ctx.from.id;
      if (
        waitingForRenewImage.has(userID) ||
        waitingForCreateImage.has(userID)
      ) {
        await handleImagesIncome(ctx);
      }
      if (!ctx.message?.text) return;

      switch (ctx.message.text) {
        case buySubBtn:
          if (!state.isSellActive) {
            await ctx.reply(disableSellTxt, { reply_markup: mainMenu });
            break;
          }
          await handleCreateAccount(ctx);
          break;

        case mySubBtn:
          await handleCheckAccount(ctx, db);
          break;

        case renewSubBtn:
          if (!state.isRenewActive) {
            ctx.reply(disableRenewTxt, { reply_markup: mainMenu });
            break;
          }
          await handleRenewAccount(ctx, db);
          break;

        case getConfigBtn:
          await handleGetConfig(ctx, db);
          break;

        case tutorialBtnTxt:
          await ctx.reply("آموزش به زودی اضافه میشه! لطفا صبور باشید...", {
            reply_markup: mainMenu,
          });
          break;

        case contactTxt:
          await ctx.reply(
            `
برای ارتباط با پشتیبانی میتونید به آیدی زیر پیام بدید 👇

🆔: @foxngsup
      `,
            { reply_markup: mainMenu },
          );
          break;

        case resetBtn:
        case cancelBtn:
          await ctx.deleteMessage();

          waitingForRenewImage.delete(userID);
          pendingRenewals.delete(userID);
          pendingConfig.delete(userID);
          pendingConfigType.delete(userID);

          waitingForCreateImage.delete(userID);
          pendingCreates.delete(userID);
          pendingCreateConfig.delete(userID);
          pendingCreateConfigType.delete(userID);

          await ctx.reply(greet, {
            reply_markup: mainMenu,
          });
          break;

        case oneM40G:
          if (pendingConfig.has(ctx.from.id)) {
            pendingConfigType.set(ctx.from.id, "250");
            waitingForRenewImage.add(userID);

            await ctx.reply(renewTxt250, {
              parse_mode: "HTML",
              reply_markup: new Keyboard().text(cancelBtn).resized(),
            });
          } else if (pendingCreateConfig.has(ctx.from.id)) {
            pendingCreateConfigType.set(ctx.from.id, "250");
            waitingForCreateImage.add(userID);
            console.log("added create image id");

            await ctx.reply(buyTxt250, {
              parse_mode: "HTML",
              reply_markup: new Keyboard().text(cancelBtn).resized(),
            });
          }
          break;

        case oneM80G:
          if (pendingConfig.has(ctx.from.id)) {
            pendingConfigType.set(ctx.from.id, "450");
            waitingForRenewImage.add(userID);

            await ctx.reply(renewTxt450, {
              parse_mode: "HTML",
              reply_markup: new Keyboard().text(cancelBtn).resized(),
            });
          } else if (pendingCreateConfig.has(ctx.from.id)) {
            pendingCreateConfigType.set(ctx.from.id, "450");
            waitingForCreateImage.add(userID);

            await ctx.reply(buyTxt450, {
              parse_mode: "HTML",
              reply_markup: new Keyboard().text(cancelBtn).resized(),
            });
          }
          break;

        case myPanelsBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟", {
              reply_markup: mainMenu,
            });
            break;
          }
          await showPanelsListToAdmin(ctx, db);
          break;

        case addPanelBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟", {
              reply_markup: mainMenu,
            });
            break;
          }
          await ctx.conversation.enter("addPanelConv");
          break;

        case deletePanelBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟", {
              reply_markup: mainMenu,
            });
            break;
          }
          await ctx.conversation.enter("removePanelConv");
          break;

        case appStateBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟", {
              reply_markup: mainMenu,
            });
            break;
          }
          await ctx.reply(
            `وضعیت خرید و تمدید:\n\nخرید: ${state.isSellActive ? "فعال" : "غیرفعال"}\nتمدید: ${state.isRenewActive ? "فعال" : "غیرفعال"}`,
          );
          break;

        case changeSellStateBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟", {
              reply_markup: mainMenu,
            });
            break;
          }
          state.isSellActive = !state.isSellActive;
          await ctx.reply(
            `وضعیت خرید به ${state.isSellActive ? "فعال" : "غیرفعال"} تغییر پیدا کرد.`,
          );
          break;

        case changeRenewStateBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟", {
              reply_markup: mainMenu,
            });
            break;
          }
          state.isRenewActive = !state.isRenewActive;
          await ctx.reply(
            `وضعیت تمدید به ${state.isRenewActive ? "فعال" : "غیرفعال"} تغییر پیدا کرد.`,
          );
          break;

        default:
          break;
      }
    });

    this.bot.callbackQuery(/^renew:/, handleRenewCallback);

    this.bot.callbackQuery(/^renewDecline:/, handleRenewDeclineCallback);
    this.bot.callbackQuery(/^createDecline:/, handleCreateDeclineCallback);
    this.bot.callbackQuery(/^createAccept:/, async (ctx: Context) => {
      const adminID = ctx.from?.id!;
      if (adminID !== ADMIN_ID)
        return await ctx.answerCallbackQuery({ text: "Not allowed" });

      const userId = Number(
        ctx.callbackQuery?.data!.replace("createAccept:", ""),
      );
      const pending = pendingCreates.get(userId);
      if (!pending)
        return await ctx.answerCallbackQuery({ text: "No pending request" });

      const panels = getAllPanels(db);
      if (panels.length === 0)
        return await ctx.answerCallbackQuery({ text: "No panels available" });

      for (const panel of panels) {
        if (panel.name === WHICH_PANEL) {
          const uuid = await panel.getNewUUID();
          const email = creatingEmail.get(userId)!;

          const type = pendingCreateConfigType.get(userId)!;

          pendingCreates.delete(userId);
          pendingCreateConfig.delete(userId);
          pendingCreateConfigType.delete(userId);

          let settings = "";
          if (type === "250") {
            settings = JSON.stringify({
              clients: [
                {
                  id: uuid,
                  flow: "",
                  email,
                  limitIp: 0,
                  totalGB: Util.gigsToBytes(30),
                  expiryTime: Date.now() + Util.getUnixTimeOf({ days: 30 }),
                  enable: true,
                  tgId: userId,
                  subId: "",
                  comment: String(userId),
                  reset: 0,
                },
              ],
            });
          } else if (type === "450") {
            settings = JSON.stringify({
              clients: [
                {
                  id: uuid,
                  flow: "",
                  email,
                  limitIp: 0,
                  totalGB: Util.gigsToBytes(65),
                  expiryTime: Date.now() + Util.getUnixTimeOf({ days: 30 }),
                  enable: true,
                  tgId: userId,
                  subId: "",
                  comment: String(userId),
                  reset: 0,
                },
              ],
            });
          }

          creatingEmail.delete(userId);

          const body = JSON.stringify({
            id: Number(WHICH_INBOUND),
            settings: settings,
          });

          const url = panel.getAddClientPath(panel.url);

          const req = Util.newPostRequest(url, panel.headers, body);

          const res = await fetch(req);

          const responseBody = await res.body?.text();

          const { qrFile, configLink } = await genConfig(panel, email, uuid);

          if (res.status === 200 && responseBody?.includes("true")) {
            await ctx.api.sendPhoto(userId, qrFile, {
              caption: `اشتراک شما با موفقیت فعال شد ✅\n\nلینک کانفیگ شما 👇\n(برای کپی کردن لینک یک بار روی آن کلیک کنید.)\n\n<code>${configLink}</code>\n\nاگه بلد نیستی از لینک استفاده کنی از دکمه\n"⚙️ آموزش اتصال به کانفیگ" استفاده کن`,
              parse_mode: "HTML",
            });
            await ctx.reply("تایید شد ✅");
            await ctx.answerCallbackQuery();
          } else {
            console.log(res.status, responseBody);
            await ctx.answerCallbackQuery({ text: "خطا در ساخت اشتراک!" });
          }
          break;
        }
      }
    });
    this.bot.callbackQuery(/^renewAccept:/, async (ctx: Context) => {
      const adminID = ctx.from?.id!;
      if (adminID !== ADMIN_ID)
        return await ctx.answerCallbackQuery({ text: "Not allowed" });

      const userId = Number(
        ctx.callbackQuery?.data!.replace("renewAccept:", ""),
      );
      const pending = pendingRenewals.get(userId);
      if (!pending)
        return await ctx.answerCallbackQuery({ text: "No pending request" });

      const { UUID, inboundID } = pendingConfig.get(userId)!;
      const type = pendingConfigType.get(userId)!;

      pendingRenewals.delete(userId);
      pendingConfig.delete(userId);
      pendingConfigType.delete(userId);

      const configs = renewCache[userId]?.filter(
        (v) =>
          (v.isRenewable && v.uuid === UUID) ||
          (v.status === false && v.uuid === UUID),
      );

      const rawEmail = Util.removeEmoji(configs?.at(0)?.email!);
      const emailParts = rawEmail.split("-");
      const email = emailParts.slice(1).join("-");

      console.log("the UUID:", UUID);

      const panel = await getConfigsPanel(UUID, db);
      if (!panel) {
        return await ctx.answerCallbackQuery({ text: "Panel not found!" });
      }

      let settings = "";
      if (type === "250") {
        settings = JSON.stringify({
          clients: [
            {
              id: UUID,
              flow: "",
              email,
              limitIp: 0,
              totalGB: Util.gigsToBytes(30),
              expiryTime: Date.now() + Util.getUnixTimeOf({ days: 30 }),
              enable: true,
              tgId: userId,
              subId: "",
              comment: String(userId),
              reset: 0,
            },
          ],
        });
      } else if (type === "450") {
        settings = JSON.stringify({
          clients: [
            {
              id: UUID,
              flow: "",
              email,
              limitIp: 0,
              totalGB: Util.gigsToBytes(65),
              expiryTime: Date.now() + Util.getUnixTimeOf({ days: 30 }),
              enable: true,
              tgId: userId,
              subId: "",
              comment: String(userId),
              reset: 0,
            },
          ],
        });
      }

      const body = JSON.stringify({
        id: inboundID,
        settings: settings,
      });

      const url = panel.getUpdatePath(panel.url, UUID);

      const req = Util.newPostRequest(url, panel.headers, body);

      const res = await fetch(req);

      if (res.status === 200) {
        const reset = await panel.resetClientTraffic(inboundID, email);
        if (reset) {
          await ctx.api.sendMessage(userId, "اشتراک شما با موفقیت فعال شد ✅");
          await ctx.reply("تایید شد ✅");
          await ctx.answerCallbackQuery();
        }
      } else {
        console.log(res.status);
      }
    });
    this.bot.callbackQuery(/^getConfig:/, async (ctx) => {
      const index = Number(ctx.callbackQuery?.data?.replace("getConfig:", ""));
      const userID = ctx.from?.id!;

      const configs = getConfigCache[userID];

      if (!configs) return;

      const selected = configs[index];

      const panel = await getConfigsPanel(selected?.uuid!, db);

      const { qrFile, configLink } = await genConfig(
        panel!,
        Util.removeEmoji(selected?.email.split("-").slice(1).join("-")!),
        selected?.uuid!,
        selected?.inboundID,
      );

      await ctx.deleteMessage();
      await ctx.api.sendPhoto(userID, qrFile, {
        caption: `لینک کانفیگ شما به نام ${Util.removeEmoji(selected?.email!)} 👇\n(برای کپی کردن لینک یک بار روی آن کلیک کنید.)\n\n<code>${configLink}</code>`,
        parse_mode: "HTML",
      });
      await ctx.answerCallbackQuery();
    });
  }
}
