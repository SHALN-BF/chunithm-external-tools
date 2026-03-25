# Chunithm Best Score Bot

This is a Discord bot that automates the generation of Chunithm Best Score images using Puppeteer and the existing `main.js` logic.

## Setup

1.  **Install Dependencies**:
    ```bash
    cd bot
    npm install
    ```

2.  **Configure Environment**:
    Copy `.env.example` to `.env` and fill in the details:
    ```bash
    cp .env.example .env
    ```
    - `DISCORD_TOKEN`: Your Discord Bot Token.
    - `ALLOWED_USERS`: Comma-separated list of Discord User IDs allowed to use the bot (always allowed).
    - `ENCRYPTION_KEY`: A 32-character random string for encrypting SEGA credentials.
    - `BOT_ADMIN`: Comma-separated list of Discord User IDs who can approve requests and manage users.
    - `REQUEST_CHANNEL_ID`: Channel ID where access requests are posted (buttons enabled).
    - `REQUEST_WEBHOOK_URL`: Fallback request destination if no channel is configured.
    - `LOG_WEBHOOK_URL`: Optional webhook for log messages and full-score images.
    - `GUILD_IDS`: Comma-separated list of guild IDs for registering `g-` prefixed commands.
    - `BOT_DELAY_MS`: Delay between requests in milliseconds (defaults to 1000ms). Internally converted to seconds.
    - `BOT_GENERATION_TIMEOUT_MS`: Generation timeout (paid/standard) in milliseconds (defaults to 180000ms).
    - `BOT_GENERATION_TIMEOUT_FREE_MS`: Generation timeout (free mode) in milliseconds (defaults to 900000ms).

3.  **Run the Bot**:
    ```bash
    node index.js
    ```

## Commands

-   `/register [sega_id] [password]`: Register your SEGA ID credentials securely. (Ephemeral)
-   `/best [hidescore]`: Generate and send your Best Score image. If `hidescore` is true, rating/score/rank are hidden and the graph image is not sent.
-   `/request`: Open an access request modal (SEGA ID optional, reason required).
-   `/users`: List allowed users (admin only).
-   `/user-add [user]`: Approve a user manually (admin only).
-   `/user-remove [user]`: Remove a user from approvals (admin only; env users cannot be removed here).

If `GUILD_IDS` is set, guild commands are registered with a `g-` prefix (for example, `/g-best`, `/g-request`).

## Notes

-   The bot uses a headless browser to log in to Chunithm-NET.
-   Credentials are stored in [userData.json](userData.json) encrypted with `aes-256-cbc`.
-   Approved users are stored in [approvals.json](approvals.json).
-   The generation process takes about 1-2 minutes per request.

## Example Files

-   [approvals.json.example](approvals.json.example)
-   [userData.json.example](userData.json.example)
