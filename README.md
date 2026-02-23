# sh-bot

A Telegram bot that connects to you 3X-UI v2ray VPN panel and let's you automate you misery.

Usage:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/logicblade/sh-bot/refs/heads/main/install.sh)
```

This will install the bot and ask you for your Telegram bot token and your telegram user ID for admin purposes.

To update, you can use:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/logicblade/sh-bot/refs/heads/main/update.sh)
```

**IMPORTANT**
Be sure to check the generated .env file.

```text
BOT_TOKEN=Your-Telegram-Bot-Token-From-BotFather
ADMIN_ID=Your-Admins-Telegram-ID
```

## Configuration

Remember to start the conversation with your bot as admin to add your 3X-UI panel URL and information.

### Development

To install dependencies:

```bash
bun install
```

To run locally:

```bash
bun run dev
```

To run in production environment:

```bash
bun run start
```
