# Top-Level Guidelines:
* All replies to developers must be in Japanese.
* When modifying confidential data or large datasets (including source code), always clearly state and explain the scope of the impact and consider the maximum potential damage.
* The system should be designed to be more integrated, and hard-coding should be avoided. This is the most important design principle for all projects, excluding test code.
## Mid-Level Guidelines:
* When responding, always explicitly state any potential bugs.
* Concerns regarding compatibility with the previous file system. This does not prohibit changes that break compatibility, but it is not recommended either.
* Items to be handed over or noted should be updated as needed in the “Handover Items” section below.
## Handover Items
* 無料モードの長時間実行対策として、PuppeteerのprotocolTimeoutを`BOT_PROTOCOL_TIMEOUT_MS`で調整可能。
* `BOT_GENERATION_TIMEOUT_FREE_MS=0`で無料モード無制限待機、既定は45分相当など環境変数で制御。
* `/best`は5分経過後にチャンネル送信に切り替える挙動あり（タイムアウト通知）。
* ユーザー情報/申請状態/認可状態/資格情報は`users.json`にユーザー単位で統合。
* ギルド単位コマンドは廃止し、グローバルのみで運用。
