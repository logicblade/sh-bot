import { fetch } from "bun";
import type { DB } from "../../util/db";
import { Util } from "../../util/util";

export function getAllPanels(db: DB) {
  let panels: Panel[] = [];

  const creds = db.getPanels();

  for (const cred of creds) {
    const panel = new Panel(cred.name, cred.url, cred.username, cred.password);
    panels.push(panel);
  }

  return panels;
}

export class Panel {
  private BASE_PATH = "/panel/api/inbounds";
  private LOGIN_PATH = "/login";
  private UPDATE_CLIENT_PATH = "/updateClient/";
  private GET_INBOUNDS_PATH = "/list";
  private UUID_ABS_PATH = "/panel/api/server/getNewUUID";
  private STATUS_ABS_PATH = "/panel/api/server/status";

  headers = new Headers();
  private lastLogins = new Map<string, number>();

  name: string;
  url: string;
  private username: string;
  private password: string;

  constructor(name: string, url: string, usename: string, password: string) {
    this.headers.set("Content-Type", "application/json");
    this.headers.set("Accept", "application/json");

    this.name = name;
    this.url = url;
    this.username = usename;
    this.password = password;
  }

  getUpdatePath(url: string, uuid: string) {
    return `${url}${this.BASE_PATH}${this.UPDATE_CLIENT_PATH}${uuid}`;
  }

  async resetClientTraffic(inboundID: number, email: string) {
    await this.handleLogin();

    const url = `${this.url}${this.BASE_PATH}/${inboundID}/resetClientTraffic/${email}`;

    const req = Util.newPostRequest(url, this.headers);
    const res = await fetch(req);

    if (res.status !== 200) {
      return false;
    } else {
      return true;
    }
  }

  async getInbounds() {
    await this.handleLogin();

    const url = `${this.url}${this.BASE_PATH}${this.GET_INBOUNDS_PATH}`;
    const req = Util.newGetRequest(url, this.headers);

    try {
      const res = await fetch(req);

      const js = (await res.json()) as Omit<GetInboundsResponse, "obj"> & {
        obj: (Omit<Obj, "settings" | "streamSettings"> & {
          settings: string;
          streamSettings: string;
        })[];
      };

      const parsed: GetInboundsResponse = {
        ...js,
        obj: js.obj.map((obj) => ({
          ...obj,
          settings: JSON.parse(obj.settings) as Settings,
          streamSettings: JSON.parse(obj.streamSettings) as StreamSettings,
        })),
      };

      return parsed;
    } catch (error) {
      console.error("Failed to get all inbounds:", error);
      return;
    }
  }

  async getUserConfig(userID: number) {
    await this.handleLogin();

    const inbounds = await this.getInbounds();

    if (inbounds) {
      let userConfigs: UserConfig[] = [];

      for (const obj of inbounds.obj) {
        obj.settings.clients.forEach((client) => {
          if (userID === Number(client.comment)) {
            const stat = obj.clientStats.find(
              (s) => s.uuid === client.id || s.email === client.email,
            );

            if (!stat) {
              console.warn(
                `No clientStat found for client id=${client.id} email=${client.email}`,
              );
            }

            const used = (stat?.down ?? 0) + (stat?.up ?? 0);
            const remainingGB = client.totalGB - used;
            const isRenewable =
              (client.expiryTime !== 0 &&
                client.expiryTime - Date.now() <
                  Util.getUnixTimeOf({ days: 3 })) ||
              (client.totalGB !== 0 && remainingGB <= Util.gigsToBytes(3));
            const inboundRemark = obj.remark;
            const status = stat?.enable ?? false;
            const hasStarted = client.expiryTime > 0;
            const displayEmail = stat?.email ?? client.email ?? "";
            const email = `${status ? (hasStarted ? (isRenewable ? "🟡" : "🟢") : "🟠") : "🔴"} ${inboundRemark}-${displayEmail}`;

            userConfigs.push({
              email,
              inboundID: stat?.inboundId ?? 0,
              inboundRemark,
              isOff: !client.enable,
              isRenewable,
              status,
              uuid: client.id,
              hasStarted,
            });
          }
        });
      }

      return userConfigs;
    }
  }

  async getNewUUID() {
    await this.handleLogin();

    const req = Util.newGetRequest(
      `${this.url}${this.UUID_ABS_PATH}`,
      this.headers,
    );

    try {
      const res = await fetch(req);
      const body = (await res.json()) as UUIDResponse;
      return body.obj.uuid;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async handleLogin() {
    const now = Date.now();

    const lastLogin = this.lastLogins.get(this.name);
    const isLoggedIn = await this.isStatusSuccess();

    if (
      isLoggedIn &&
      lastLogin &&
      now - lastLogin < Util.getUnixTimeOf({ days: 2 })
    ) {
      console.log("You're already logged in");
      return;
    }

    const loginRes = await this.performLogin();
    if (loginRes === "okay") {
      this.lastLogins.set(this.name, now);
      console.log("Login done!");
    } else {
      console.error("Failed to login for:", this.name);
    }
  }

  private async performLogin(): Promise<Result> {
    const user: LoginUser = {
      username: this.username,
      password: this.password,
    };

    const url = `${this.url}${this.LOGIN_PATH}`;

    const req = Util.newPostRequest(url, this.headers, JSON.stringify(user));

    const res = await fetch(req);
    if (res.status !== 200) {
      console.error("Failed to get response, status code", res.status);
      return "error";
    }

    const setCookieHeader = res.headers.get("Set-Cookie");
    if (setCookieHeader?.includes("3x-ui=")) {
      const tokenFromCookie = setCookieHeader.split(";")[0];
      if (tokenFromCookie) {
        this.headers.set("Cookie", tokenFromCookie!);
        return "okay";
      }
    }

    return "error";
  }

  private async isStatusSuccess() {
    const loginURL = `${this.url}${this.STATUS_ABS_PATH}`;

    const req = Util.newGetRequest(loginURL, this.headers);

    const res = await fetch(req);

    return res.status === 200;
  }
}
