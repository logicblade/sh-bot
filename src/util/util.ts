export class Util {
  private static unixHour: number = 60 * 60 * 1000;

  public static getUnixTimeOf({ days = 1, hours = 24 }) {
    return days * hours * this.unixHour;
  }

  public static gigsToBytes(size: number) {
    return size * 1073741824;
  }

  public static newPostRequest(url: string, headers: Headers, body?: string) {
    return new Request(url, {
      method: "POST",
      headers,
      body,
      credentials: "include",
    });
  }

  public static newGetRequest(url: string, headers: Headers) {
    return new Request(url, {
      method: "GET",
      headers,
      credentials: "include",
    });
  }

  public static removeEmoji(email: string) {
    return email.replace(/^\p{Extended_Pictographic}\s*/u, "");
  }
}
