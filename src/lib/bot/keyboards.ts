import { InlineKeyboard, Keyboard } from "grammy";
import {
  tutorialBtnTxt,
  renewSubBtn,
  buySubBtn,
  mySubBtn,
  contactTxt,
  resetBtn,
  oneM40G,
  oneM80G,
  addPanelBtn,
  myPanelsBtn,
  deletePanelBtn,
} from "./messages";

export const shareContactKey = new Keyboard()
  .requestContact("☎️ ارسال شماره موبایل")
  .resized()
  .oneTime();

export const mainMenu = new Keyboard()
  .text(renewSubBtn)
  .text(buySubBtn)
  .row()
  .text(tutorialBtnTxt)
  .text(mySubBtn)
  .row()
  .text(contactTxt)
  .resized()
  .persistent();

export const renewMenu = new Keyboard()
  .text(oneM40G)
  .row()
  .text(oneM80G)
  .row()
  .text(resetBtn)
  .resized();

export const adminReplyKeys = (userID: number) =>
  new InlineKeyboard()
    .text("✅ قبول", `renewAccept:${userID}`)
    .text("❌ رد", `renewDecline:${userID}`);

export const adminMenu = new Keyboard()
  .text(myPanelsBtn)
  .row()
  .text(deletePanelBtn)
  .text(addPanelBtn)
  .resized();
