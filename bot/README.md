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
    - `ALLOWED_USERS`: Comma-separated list of Discord User IDs allowed to use the bot.
    - `ENCRYPTION_KEY`: A 32-character random string for encrypting SEGA credentials.

3.  **Run the Bot**:
    ```bash
    node index.js
    ```

## Commands

-   `/register [sega_id] [password]`: Register your SEGA ID credentials securely. (Ephemeral)
-   `/best`: Generate and send your Best Score image.

## Notes

-   The bot uses a headless browser to log in to Chunithm-NET.
-   Credentials are stored in `userData.json` encrypted with `aes-256-cbc`.
-   The generation process takes about 1-2 minutes per request.
