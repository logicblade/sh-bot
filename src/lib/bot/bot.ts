import { Bot, Context, Keyboard } from "grammy";
import { DB } from "../../util/db";
import {
  addPanelConv,
  ADMIN_ID,
  getConfigsPanel,
  handleCheckAccount,
  handleImagesIncome,
  handleRenewAccount,
  handleRenewCallback,
  handleRenewDeclineCallback,
  handleStartCommandForAdmin,
  handleStartCommandForUser,
  pendingConfig,
  pendingConfigType,
  pendingRenewals,
  removePanelConv,
  renewCache,
  showPanelsListToAdmin,
  waitingForRenewImage,
} from "./helpers";
import {
  buySubBtn,
  buySubTxt,
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
} from "./messages";
import {
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { mainMenu } from "./keyboards";
import { Util } from "../../util/util";

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
      if (waitingForRenewImage.has(userID)) {
        await handleImagesIncome(ctx);
      }
      if (!ctx.message?.text) return;

      switch (ctx.message.text) {
        case buySubBtn:
          await ctx.reply(buySubTxt);
          break;

        case mySubBtn:
          await handleCheckAccount(ctx, db);
          break;

        case renewSubBtn:
          await handleRenewAccount(ctx, db);
          break;

        case tutorialBtnTxt:
          await ctx.reply("آموزش به زودی اضافه میشه! لطفا صبور باشید...");
          break;

        case contactTxt:
          await ctx.reply(`
برای ارتباط با پشتیبانی میتونید به آیدی زیر پیام بدید 👇

🆔: @foxngsup
      `);
          break;

        case resetBtn:
        case cancelBtn:
          await ctx.deleteMessage();

          waitingForRenewImage.delete(userID);
          pendingRenewals.delete(userID);
          pendingConfig.delete(userID);
          pendingConfigType.delete(userID);

          await ctx.reply(greet, {
            reply_markup: mainMenu,
          });
          break;

        case oneM40G:
          pendingConfigType.set(ctx.from.id, "250");
          waitingForRenewImage.add(userID);
          await ctx.reply(renewTxt250, {
            parse_mode: "HTML",
            reply_markup: new Keyboard().text(cancelBtn).resized(),
          });
          break;

        case oneM80G:
          pendingConfigType.set(ctx.from.id, "450");
          waitingForRenewImage.add(userID);
          await ctx.reply(renewTxt450, {
            parse_mode: "HTML",
            reply_markup: new Keyboard().text(cancelBtn).resized(),
          });
          break;

        case myPanelsBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟");
            break;
          }
          await showPanelsListToAdmin(ctx, db);
          break;

        case addPanelBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟");
            break;
          }
          await ctx.conversation.enter("addPanelConv");
          break;

        case deletePanelBtn:
          if (userID !== ADMIN_ID) {
            await ctx.reply("این حرفا رو از کجا یاد گرفتی؟؟");
            break;
          }
          await ctx.conversation.enter("removePanelConv");
          break;

        default:
          break;
      }
    });

    this.bot.callbackQuery(/^renew:/, handleRenewCallback);

    this.bot.callbackQuery(/^renewDecline:/, handleRenewDeclineCallback);
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

      console.log("got panel", panel.name);

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

      console.log("settings done:", settings);

      const body = JSON.stringify({
        id: inboundID,
        settings: settings,
      });

      const url = panel.getUpdatePath(panel.url, UUID);
      console.log("got update path");

      const req = Util.newPostRequest(url, panel.headers, body);

      console.log("sending fetch");

      const res = await fetch(req);
      console.log("fetch done");

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
  }
}
