(async function () {
    'use strict';
    const CURRENT_VERSION = "X-VERSE-X";

    const GITHUB_USER = "SHALN-BF";
    const GITHUB_REPO = "chunithm-external-tools";
    const CONST_DATA_URL = `https://reiwa.f5.si/chunithm_record.json`;

    const BASE_URL = "https://new.chunithm-net.com/chuni-mobile/html/mobile/";
    const URL_PLAYER_DATA = BASE_URL + "home/playerData/";
    const URL_RATING_BEST = URL_PLAYER_DATA + "ratingDetailBest/";
    const URL_RATING_RECENT = URL_PLAYER_DATA + "ratingDetailRecent/";
    const URL_SEND_DETAIL = BASE_URL + "record/musicGenre/sendMusicDetail/";
    const URL_DETAIL = BASE_URL + "record/musicDetail/";
    const URL_RANKING_MASTER_SEND = BASE_URL + "ranking/sendMaster/";
    const URL_RANKING_MASTER = BASE_URL + "ranking/master/";
    const URL_RANKING_DETAIL_SEND = BASE_URL + "ranking/sendRankingDetail/";
    const URL_RANKING_DETAIL = BASE_URL + "ranking/musicRankingDetail/";
    const URL_RANKING_BASIC_SEND = URL_RANKING_DETAIL + "sendRankingBasic/";
    const URL_RANKING_ADVANCED_SEND = URL_RANKING_DETAIL + "sendRankingAdvanced/";
    const URL_RANKING_MASTER_DETAIL_SEND = URL_RANKING_DETAIL + "sendRankingMaster/";
    const URL_RANKING_ULTIMA_SEND = URL_RANKING_DETAIL + "sendRankingUltima/";
    const URL_RANKING_EXPERT_SEND = URL_RANKING_DETAIL + "sendRankingExpert/";

    let isAborted = false;

    const overlay = document.createElement('div');
    const message = document.createElement('div');
    const globalCloseButton = document.createElement('button');

    // エラーメッセージ
    // エラーメッセージ
    const showError = (errorMessage) => {
        console.error(errorMessage);
        overlay.innerHTML = '';
        message.style.cssText = `
            text-align: center;
            font-size: 18px;
            background-color: rgba(244, 67, 54, 0.2);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid rgba(244, 67, 54, 0.5);
        `;
        message.textContent = `エラー: ${errorMessage}`;
        overlay.appendChild(message);
        overlay.appendChild(globalCloseButton);
        if (!document.body.contains(overlay)) {
            document.body.appendChild(overlay);
        }
    };

    if (window.location.hostname !== 'new.chunithm-net.com') {
        document.body.appendChild(overlay);
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); z-index: 9999; display: flex;
            justify-content: center; align-items: center; color: white;
            font-family: sans-serif; padding: 20px; box-sizing: border-box;
        `;
        showError("このブックマークレットはCHUNITHM-NET内でのみ実行できます");
        globalCloseButton.onclick = () => document.body.removeChild(overlay);
        return;
    }

    const addGlobalStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes pulseGlow {
                0% { box-shadow: 0 0 8px #5cb85c, 0 0 12px #5cb85c; }
                50% { box-shadow: 0 0 16px #6fdc6f, 0 0 24px #6fdc6f; }
                100% { box-shadow: 0 0 8px #5cb85c, 0 0 12px #5cb85c; }
            }
        `;
        document.head.appendChild(style);
    };
    addGlobalStyles();

    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85); z-index: 9999; display: flex;
        justify-content: center; align-items: center; color: white;
        font-family: sans-serif; padding: 20px; box-sizing: border-box;
    `;
    document.body.appendChild(overlay);

    globalCloseButton.innerHTML = '&times;';
    globalCloseButton.style.cssText = `
        position: fixed;
        top: 15px;
        right: 20px;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.4);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 28px;
        line-height: 38px;
        text-align: center;
        cursor: pointer;
        padding: 0;
        transition: background-color 0.2s, transform 0.1s;
    `;
    globalCloseButton.onmouseover = () => { globalCloseButton.style.backgroundColor = 'rgba(244, 67, 54, 0.8)'; };
    globalCloseButton.onmouseout = () => { globalCloseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'; };
    globalCloseButton.onmousedown = () => { globalCloseButton.style.transform = 'scale(0.9)'; };
    globalCloseButton.onmouseup = () => { globalCloseButton.style.transform = 'scale(1)'; };

    globalCloseButton.onclick = () => {
        isAborted = true;
        console.log("処理がユーザーによって中断されました");
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    };
    overlay.appendChild(globalCloseButton);

    /**
     * @returns {Promise<{mode: string, delay: number, scanMode: string, bestConstThreshold: number, newConstThreshold: number}>}
     */
    const askForSettings = () => {
        return new Promise(resolve => {
            let selectedMode = null;
            let selectedScanMode = 'paid';
            let scrapeDelay = 1.0;
            let bestConstThreshold = 14.5;
            let newConstThreshold = 13.5;

            const container = document.createElement('div');
            container.style.cssText = `
                background-color: rgba(40, 40, 55, 0.95);
                padding: 40px; border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                text-align: center; width: 650px; max-height: 90vh; overflow-y: auto;
            `;

            const title = document.createElement('h2');
            title.textContent = 'CHUNITHM 画像ジェネレーター設定';
            title.style.cssText = 'font-size: 28px; margin-bottom: 15px; font-weight: bold; color: #E0E0E0; line-height: 1.4;';
            container.appendChild(title);

            const subtitle = document.createElement('p');
            subtitle.innerHTML = '動作モード、画像レイアウト、取得間隔を設定してください';
            subtitle.style.cssText = 'font-size: 16px; margin-bottom: 30px; color: #B0B0B0;';
            container.appendChild(subtitle);

            const scanModeSection = document.createElement('div');
            scanModeSection.style.cssText = 'margin-bottom: 30px;';
            const scanModeLabel = document.createElement('label');
            scanModeLabel.textContent = '動作モード';
            scanModeLabel.style.cssText = 'display: block; font-size: 18px; font-weight: bold; color: #D0D0D0; margin-bottom: 15px;';
            scanModeSection.appendChild(scanModeLabel);

            const scanModeButtonsContainer = document.createElement('div');
            scanModeButtonsContainer.style.cssText = 'display: flex; justify-content: center; gap: 20px;';
            const constThresholdSection = document.createElement('div');
            constThresholdSection.style.cssText = 'margin-top: 25px; display: none;';

            const createScanModeButton = (text, scanMode) => {
                const button = document.createElement('button');
                button.innerHTML = text;
                button.dataset.scanMode = scanMode;
                button.style.cssText = `
                    flex: 1; padding: 15px; font-size: 16px; font-weight: bold; cursor: pointer;
                    background-color: #333; color: white; border: 2px solid #555; border-radius: 8px;
                    transition: all 0.2s ease-out;
                `;
                button.onclick = () => {
                    selectedScanMode = scanMode;
                    updateScanModeButtons();
                    checkIfReady();
                };
                return button;
            };

            const updateScanModeButtons = () => {
                document.querySelectorAll('button[data-scan-mode]').forEach(btn => {
                    const isSelected = btn.dataset.scanMode === selectedScanMode;
                    btn.style.backgroundColor = isSelected ? '#4A90E2' : '#333';
                    btn.style.borderColor = isSelected ? '#6FBFFF' : '#555';
                });
                constThresholdSection.style.display = selectedScanMode === 'free' ? 'block' : 'none';
            };

            scanModeButtonsContainer.appendChild(createScanModeButton('通常モード<br><small>(Rating準拠 / 課金ユーザー)</small>', 'paid'));
            scanModeButtonsContainer.appendChild(createScanModeButton('無料モード<br><small>(全曲スキャン / 無料ユーザー)</small>', 'free'));
            scanModeSection.appendChild(scanModeButtonsContainer);
            container.appendChild(scanModeSection);

            const constInputsContainer = document.createElement('div');
            constInputsContainer.style.cssText = 'display: flex; justify-content: center; gap: 30px; align-items: center;';

            const createConstInput = (labelText, value, callback) => {
                const wrapper = document.createElement('div');
                const label = document.createElement('label');
                label.textContent = labelText;
                label.style.cssText = 'display: block; font-size: 16px; color: #D0D0D0; margin-bottom: 10px;';
                wrapper.appendChild(label);

                const input = document.createElement('input');
                input.type = 'number';
                input.value = value;
                input.min = '13.0';
                input.max = '15.4';
                input.step = '0.1';
                input.style.cssText = `
                    width: 100px; padding: 8px; font-size: 18px; text-align: center;
                    background-color: #222; color: white; border: 1px solid #555; border-radius: 5px;
                `;
                input.onchange = () => {
                    const val = parseFloat(input.value);
                    if (!isNaN(val) && val >= 13.0 && val <= 15.4) {
                        callback(val);
                    } else {
                        input.value = callback(null);
                    }
                };
                wrapper.appendChild(input);
                return wrapper;
            };

            const bestInputWrapper = createConstInput('BEST枠 最小定数', bestConstThreshold, (val) => {
                if (val !== null) bestConstThreshold = val;
                return bestConstThreshold;
            });
            const newInputWrapper = createConstInput('新曲枠 最小定数', newConstThreshold, (val) => {
                if (val !== null) newConstThreshold = val;
                return newConstThreshold;
            });

            constInputsContainer.appendChild(bestInputWrapper);
            constInputsContainer.appendChild(newInputWrapper);
            constThresholdSection.appendChild(constInputsContainer);

            const freeModeWarning = document.createElement('p');
            freeModeWarning.innerHTML = '⚠️ <strong>注意:</strong> 無料モードは楽曲ランキング経由で広範囲を取得するため、完了まで時間がかかります。取得間隔は余裕を持って設定してください。';
            freeModeWarning.style.cssText = 'font-size: 14px; margin-top: 15px; color: #FFC107; background-color: rgba(255, 193, 7, 0.1); padding: 10px; border-radius: 5px; border: 1px solid rgba(255, 193, 7, 0.3);';
            constThresholdSection.appendChild(freeModeWarning);
            container.appendChild(constThresholdSection);

            // Chunithm-netへの負荷軽減だったり、レートリミット対策だったり
            const delaySection = document.createElement('div');
            delaySection.style.cssText = 'margin-bottom: 30px; margin-top: 20px;';
            const delayLabel = document.createElement('label');
            delayLabel.textContent = '取得間隔 (秒)';
            delayLabel.style.cssText = 'display: block; font-size: 18px; font-weight: bold; color: #D0D0D0; margin-bottom: 15px;';
            delaySection.appendChild(delayLabel);
            const delayControls = document.createElement('div');
            delayControls.style.cssText = 'display: flex; justify-content: center; align-items: center;';
            const delayValueSpan = document.createElement('span');
            delayValueSpan.textContent = scrapeDelay.toFixed(2);
            delayValueSpan.style.cssText = 'font-size: 24px; font-weight: bold; color: white; width: 80px;';
            const createControlButton = (text) => {
                const button = document.createElement('button');
                button.textContent = text;
                button.style.cssText = `
                    width: 50px; height: 50px; margin: 0 15px; font-size: 24px;
                    cursor: pointer; background-color: #4A90E2; color: white;
                    border: none; border-radius: 50%; transition: all 0.2s ease-out; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                `;
                button.onmouseover = () => {
                    button.style.backgroundColor = '#357ABD';
                    button.style.transform = 'scale(1.1)';
                };
                button.onmouseout = () => {
                    button.style.backgroundColor = '#4A90E2';
                    button.style.transform = 'scale(1)';
                };
                button.onmousedown = () => { button.style.transform = 'scale(0.95)'; };
                button.onmouseup = () => { button.style.transform = 'scale(1.1)'; };
                return button;
            };
            const minusButton = createControlButton('-');
            minusButton.onclick = () => {
                if (scrapeDelay > 0) {
                    scrapeDelay = Math.max(0, scrapeDelay - 0.25);
                    delayValueSpan.textContent = scrapeDelay.toFixed(2);
                }
            };
            const plusButton = createControlButton('+');
            plusButton.onclick = () => {
                if (scrapeDelay < 3) {
                    scrapeDelay = Math.min(3, scrapeDelay + 0.25);
                    delayValueSpan.textContent = scrapeDelay.toFixed(2);
                }
            };
            delayControls.appendChild(minusButton);
            delayControls.appendChild(delayValueSpan);
            delayControls.appendChild(plusButton);
            delaySection.appendChild(delayControls);
            container.appendChild(delaySection);

            // 個人的には横派
            const modeSection = document.createElement('div');
            modeSection.style.cssText = 'margin-bottom: 40px;';
            const modeLabel = document.createElement('label');
            modeLabel.textContent = '画像レイアウト';
            modeLabel.style.cssText = 'display: block; font-size: 18px; font-weight: bold; color: #D0D0D0; margin-bottom: 15px;';
            modeSection.appendChild(modeLabel);
            const modeButtonsContainer = document.createElement('div');
            modeButtonsContainer.style.cssText = 'display: flex; justify-content: center; gap: 20px;';
            const generateButton = document.createElement('button');
            const createModeButton = (text, mode) => {
                const button = document.createElement('button');
                button.textContent = text;
                button.dataset.mode = mode;
                button.style.cssText = `
                    display: inline-block; width: 200px; padding: 15px;
                    font-size: 18px; font-weight: bold; cursor: pointer;
                    background-color: #333; color: white;
                    border: 2px solid #555; border-radius: 8px;
                    transition: all 0.2s ease-out;
                    transform: translateY(0);
                `;
                button.onmouseover = () => {
                    button.style.transform = 'translateY(-4px)';
                    button.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.3)';
                };
                button.onmouseout = () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = 'none';
                };
                button.onclick = () => {
                    selectedMode = mode;
                    document.querySelectorAll('button[data-mode]').forEach(btn => {
                        const isSelected = btn.dataset.mode === selectedMode;
                        btn.style.backgroundColor = isSelected ? '#4A90E2' : '#333';
                        btn.style.borderColor = isSelected ? '#6FBFFF' : '#555';
                    });
                    checkIfReady();
                };
                return button;
            };
            modeButtonsContainer.appendChild(createModeButton('縦', 'vertical'));
            modeButtonsContainer.appendChild(createModeButton('横', 'horizontal'));
            modeSection.appendChild(modeButtonsContainer);
            container.appendChild(modeSection);

            // 無駄に目立たせてみた開始ボタン
            const checkIfReady = () => {
                if (selectedMode && selectedScanMode) {
                    generateButton.disabled = false;
                    generateButton.style.opacity = '1';
                    generateButton.style.cursor = 'pointer';
                    generateButton.style.animation = 'pulseGlow 2s infinite';
                }
            };

            generateButton.textContent = '生成開始';
            generateButton.disabled = true;
            generateButton.style.cssText = `
                width: 100%; padding: 18px; font-size: 20px; font-weight: bold;
                cursor: not-allowed; background: linear-gradient(145deg, #5cb85c, #4cae4c);
                color: white; border: none; border-radius: 10px; transition: all 0.2s; opacity: 0.5;
            `;
            generateButton.onmouseover = () => { if (!generateButton.disabled) generateButton.style.background = 'linear-gradient(145deg, #4cae4c, #449d44)'; };
            generateButton.onmouseout = () => { if (!generateButton.disabled) generateButton.style.background = 'linear-gradient(145deg, #5cb85c, #4cae4c)'; };
            generateButton.onclick = () => {
                if (selectedMode && selectedScanMode) {
                    resolve({ mode: selectedMode, delay: scrapeDelay, scanMode: selectedScanMode, bestConstThreshold, newConstThreshold });
                }
            };
            container.appendChild(generateButton);

            overlay.innerHTML = '';
            overlay.appendChild(container);
            overlay.appendChild(globalCloseButton);

            updateScanModeButtons();
        });
    };

    const updateMessage = (text, progress) => {
        console.log(text);

        const textElement = message.querySelector('.progress-text');
        if (textElement) {
            textElement.style.opacity = '0';
            setTimeout(() => {
                textElement.textContent = text;
                textElement.style.opacity = '1';
            }, 200);
        }

        if (progress !== undefined) {
            const barElement = message.querySelector('.progress-bar-inner');
            if (barElement) {
                barElement.style.width = `${progress}%`;
            }
        }
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // セッション切れ、あまりにも長時間操作がなかったり、他の場所からログインしたりすると切れるやつ、そんなのでエラー報告来たら泣くから
    const fetchDocument = async (url, options = {}) => {
        const response = await fetch(url, options);
        // 503はメンテナンス中だからね
        if (response.status === 503) throw new Error("現在CHUNITHM-NETはメンテナンス中です！");
        if (!response.ok) throw new Error(`HTTPエラーが発生しました: ${response.status} (${url})`);

        const htmlText = await response.text();
        if (htmlText.includes("再度ログインしてください")) {
            throw new Error("セッションが切れました。CHUNITHM-NETに再度ログインしてください。(他の場所でログインした場合もセッションが無効になります)");
        }

        return new DOMParser().parseFromString(htmlText, 'text/html');
    };

    const scrapeRatingList = async (url) => {
        const doc = await fetchDocument(url);
        const songForms = doc.querySelectorAll('form[action$="sendMusicDetail/"]');
        const songs = [];
        for (const form of songForms) {
            const difficultyClass = form.querySelector('div[class*="bg_"]').className;
            let difficulty = "UNKNOWN";

            if (difficultyClass.includes("basic")) difficulty = "BASIC";
            else if (difficultyClass.includes("advanced")) difficulty = "ADVANCED";
            else if (difficultyClass.includes("master")) difficulty = "MASTER";
            else if (difficultyClass.includes("expert")) difficulty = "EXPERT";
            else if (difficultyClass.includes("ultima")) difficulty = "ULTIMA";

            songs.push({
                title: form.querySelector('.music_title').innerText,
                score_str: form.querySelector('.text_b').innerText,
                score_int: parseInt(form.querySelector('.text_b').innerText.replace(/,/g, ''), 10),
                difficulty: difficulty,
                params: {
                    idx: form.querySelector('input[name="idx"]').value,
                    token: form.querySelector('input[name="token"]').value,
                    genre: form.querySelector('input[name="genre"]').value,
                    diff: form.querySelector('input[name="diff"]').value,
                }
            });
        }
        return songs;
    };
    const scrapeMusicDetail = async (params) => {
        const formData = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => formData.append(key, value));

        await fetch(URL_SEND_DETAIL, { method: 'POST', body: formData });
        const doc = await fetchDocument(URL_DETAIL);

        const artist = doc.querySelector('.play_musicdata_artist')?.innerText || 'N/A';
        const jacketUrl = doc.querySelector('.play_jacket_img img')?.src || '';

        let playCount = 'N/A';
        const difficultyMap = { '0': 'basic', '1': 'advanced', '2': 'expert', '3': 'master', '4': 'ultima' };
        const diffSelector = `.music_box.bg_${difficultyMap[params.diff]}`;
        const difficultyBlock = doc.querySelector(diffSelector);

        if (difficultyBlock) {
            const dataRows = difficultyBlock.querySelectorAll('.block_underline.ptb_5');
            for (const row of dataRows) {
                const titleElement = row.querySelector('.musicdata_score_title');
                if (titleElement && titleElement.innerText.includes('プレイ回数')) {
                    const countElement = row.querySelector('.musicdata_score_num .text_b');
                    if (countElement) {
                        playCount = countElement.innerText;
                    }
                    break;
                }
            }
        }
        return { artist, jacketUrl, playCount };
    };

    const normalizeTitle = (title = '') => {
        return title
            .replace(/\u3000/g, ' ')
            .replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ')
            .replace(/[’]/g, "'")
            .replace(/[“”]/g, '"')
            .trim()
            .toLowerCase();
    };

    const getCurrentVersionName = (constData) => {
        const versions = constData
            .map(entry => (entry && typeof entry.version === 'string') ? entry.version.trim() : '')
            .filter(Boolean);

        if (versions.length === 0) return CURRENT_VERSION;

        const available = new Set(versions);
        if (available.has(CURRENT_VERSION)) {
            return CURRENT_VERSION;
        }

        const knownOrder = [
            'AIR', 'AIR PLUS',
            'STAR', 'STAR PLUS',
            'AMAZON', 'AMAZON PLUS',
            'CRYSTAL', 'CRYSTAL PLUS',
            'PARADISE', 'PARADISE LOST',
            'NEW', 'NEW PLUS',
            'SUN', 'SUN PLUS',
            'LUMINOUS', 'LUMINOUS PLUS',
            'VERSE', 'X-VERSE', 'X-VERSE-X'
        ];

        for (let i = knownOrder.length - 1; i >= 0; i--) {
            if (available.has(knownOrder[i])) {
                return knownOrder[i];
            }
        }

        return versions[versions.length - 1];
    };

    const fetchAllSongsForFreeUser = async (bestConstThreshold, newConstThreshold, delay, constData) => {
        updateMessage('ランキングページにアクセス中...', 12);

        const tokenRow = document.cookie.split('; ').find(row => row.startsWith('_t='));
        if (!tokenRow) {
            throw new Error('ランキング取得に必要なトークンが見つかりません。CHUNITHM-NETに再ログインしてください。');
        }
        const token = tokenRow.split('=')[1];

        await fetch(URL_RANKING_MASTER_SEND, {
            method: 'POST',
            body: new URLSearchParams({ genre: '99', token })
        });
        const rankingDoc = await fetchDocument(URL_RANKING_MASTER);
        if (isAborted) return null;

        const songForms = rankingDoc.querySelectorAll('form[action$="sendRankingDetail/"]');
        const initialSongList = [];
        songForms.forEach(form => {
            initialSongList.push({
                title: form.querySelector('.music_title').innerText,
                params: {
                    idx: form.querySelector('input[name="idx"]').value,
                    token: form.querySelector('input[name="token"]').value,
                    genre: form.querySelector('input[name="genre"]').value,
                    diff: form.querySelector('input[name="diff"]').value,
                }
            });
        });

        updateMessage('定数データと照合中...', 18);
        let filteredNewSongs = [];
        let filteredOldSongs = [];
        const diffMap = { BAS: '0', ADV: '1', EXP: '2', MAS: '3', ULT: '4' };
        const currentVersionName = getCurrentVersionName(constData);

        for (const songData of constData) {
            if (!songData || !diffMap[songData.diff]) continue;

            const isNewSong = songData.version === currentVersionName;
            const threshold = isNewSong ? newConstThreshold : bestConstThreshold;
            if (Number(songData.const) < threshold) continue;

            const initialSong = initialSongList.find(s => normalizeTitle(s.title) === normalizeTitle(songData.title));
            if (!initialSong) continue;

            const songObject = {
                title: songData.title,
                artist: songData.artist,
                difficulty: { BAS: 'BASIC', ADV: 'ADVANCED', MAS: 'MASTER', EXP: 'EXPERT', ULT: 'ULTIMA' }[songData.diff],
                const: Number(songData.const),
                jacketUrl: songData.img ? `https://new.chunithm-net.com/chuni-mobile/images/jacket/${songData.img}.jpg` : '',
                playCount: 'N/A',
                params: { ...initialSong.params, diff: diffMap[songData.diff] }
            };

            if (isNewSong) {
                filteredNewSongs.push(songObject);
            } else {
                filteredOldSongs.push(songObject);
            }
        }

        filteredNewSongs = filteredNewSongs.filter((song, index, self) => index === self.findIndex(s => s.title === song.title && s.difficulty === song.difficulty));
        filteredOldSongs = filteredOldSongs.filter((song, index, self) => index === self.findIndex(s => s.title === song.title && s.difficulty === song.difficulty));

        const processSongList = async (list, type, startProgress, progressShare) => {
            const detailedSongs = [];
            const total = list.length;

            for (let i = 0; i < total; i++) {
                if (isAborted) break;
                const song = list[i];
                const progress = startProgress + (i / Math.max(1, total)) * progressShare;

                if (i > 0 && delay > 0) {
                    updateMessage(`待機中... (${delay.toFixed(2)}秒) - (${i}/${total})`, progress);
                    await sleep(delay * 1000);
                }
                if (isAborted) break;

                try {
                    updateMessage(`${type}取得中: ${song.title} [${song.difficulty}] (${i + 1}/${total})`, progress);
                    await fetch(URL_RANKING_DETAIL_SEND, { method: 'POST', body: new URLSearchParams(song.params) });

                    const rankingDetailSendByDifficulty = {
                        BASIC: URL_RANKING_BASIC_SEND,
                        ADVANCED: URL_RANKING_ADVANCED_SEND,
                        EXPERT: URL_RANKING_EXPERT_SEND,
                        MASTER: URL_RANKING_MASTER_DETAIL_SEND,
                        ULTIMA: URL_RANKING_ULTIMA_SEND,
                    };
                    const difficultyDetailUrl = rankingDetailSendByDifficulty[song.difficulty];
                    if (difficultyDetailUrl) {
                        await fetch(difficultyDetailUrl, {
                            method: 'POST',
                            body: new URLSearchParams({ ...song.params, category: '1', region: '1' })
                        });
                    }
                    const scoreDoc = await fetchDocument(URL_RANKING_DETAIL);

                    const scoreElement = scoreDoc.querySelector('.rank_playdata_highscore .text_b');
                    const jacketElement = scoreDoc.querySelector('.play_jacket_img img');
                    if (!scoreElement) continue;

                    const scoreStr = scoreElement.innerText;
                    const scoreInt = parseInt(scoreStr.replace(/,/g, ''), 10);
                    if (!Number.isFinite(scoreInt) || scoreInt <= 0) continue;

                    detailedSongs.push({
                        ...song,
                        score_str: scoreStr,
                        score_int: scoreInt,
                        jacketUrl: jacketElement?.src || song.jacketUrl,
                    });
                } catch (e) {
                    console.warn(`スコア取得失敗: ${song.title}`, e);
                }
            }
            return detailedSongs;
        };

        const detailedNewSongs = await processSongList(filteredNewSongs, '新曲枠', 20, 35);
        if (isAborted) return null;
        const detailedOldSongs = await processSongList(filteredOldSongs, 'BEST枠', 55, 40);
        if (isAborted) return null;

        return { detailedNewSongs, detailedOldSongs };
    };

    const calculateRating = (score, constant) => {
        score = Number(score);
        constant = Number(constant);
        if (isNaN(score) || isNaN(constant)) return 0.00;

        let r = 0;

        if (score >= 1009000) {
            // SSS+: 譜面定数 + 2.15
            r = constant + 2.15;
        } else if (score >= 1007500) {
            // SSS: 譜面定数 + 2.0 + (100点毎に+0.01)
            r = constant + 2.00 + (score - 1007500) * 0.0001;
        } else if (score >= 1005000) {
            // SS+: 譜面定数 + 1.5 + (50点毎に+0.01)
            r = constant + 1.50 + (score - 1005000) * 0.0002;
        } else if (score >= 1000000) {
            // SS: 譜面定数 + 1.0 + (100点毎に+0.01)
            r = constant + 1.00 + (score - 1000000) * 0.0001;
        } else if (score >= 990000) {
            // S+: 譜面定数 + 0.6 + (250点毎に+0.01)
            r = constant + 0.60 + (score - 990000) * 0.00004;
        } else if (score >= 975000) {
            // S: 譜面定数 + (975,000点を超えた分/25,000)
            r = constant + (score - 975000) / 25000;
        } else if (score >= 950000) {
            // AAA: 譜面定数 - 1.67 + (150点毎に+0.01)
            r = constant - 1.67 + (score - 950000) / 15000;
        } else if (score >= 925000) {
            // AA: 譜面定数 - 3.34 + (150点毎に+0.01)
            r = constant - 3.34 + (score - 925000) / 15000;
        } else if (score >= 900000) {
            // A: 譜面定数 - 5.0 + (150点毎に+0.01)
            r = constant - 5.00 + (score - 900000) / 15000;
        } else if (score >= 800000) {
            // BBB: (譜面定数 - 5.0) / 2 + 加算分
            // 800,000点時点で (譜面定数 - 5.0) / 2
            // 2000/(譜面定数-5)点毎に+0.01 = (譜面定数-5)/2000点毎に+0.01
            const base = (constant - 5.0) / 2;
            const pointsPer001 = 2000 / (constant - 5.0);
            const increment = (score - 800000) / pointsPer001 * 0.01;
            r = base + increment;
        } else if (score >= 500000) {
            // C: 0 + 加算分
            // 500,000点時点で 0
            // 6000/(譜面定数-5)点毎に+0.01 = (譜面定数-5)/6000点毎に+0.01
            const pointsPer001 = 6000 / (constant - 5.0);
            const increment = (score - 500000) / pointsPer001 * 0.01;
            r = increment;
        } else {
            // 500,000未満は0
            r = 0;
        }

        // 0以下の場合は0になる
        if (r < 0) r = 0;

        const internal = Math.floor(r * 10000) / 10000;
        return Math.floor(internal * 100) / 100;
    };

    const getRankInfo = (score) => {
        if (score >= 1009000) return { rank: "SSS+", color: "#FFD700" };
        if (score >= 1007500) return { rank: "SSS", color: "#ffdf75" };
        if (score >= 1005000) return { rank: "SS+", color: "#ffda8aff" };
        if (score >= 1000000) return { rank: "SS", color: "#fcc652ff" };
        if (score >= 975000) return { rank: "S", color: "#ffaf47ff" };
        if (score >= 950000) return { rank: "AAA", color: "#f44336" };
        if (score >= 925000) return { rank: "AA", color: "#f44336" };
        if (score >= 900000) return { rank: "A", color: "#f44336" };
        if (score >= 800000) return { rank: "BBB", color: "#2196F3" };
        if (score >= 700000) return { rank: "BB", color: "#2196F3" };
        if (score >= 600000) return { rank: "B", color: "#2196F3" };
        if (score >= 500000) return { rank: "C", color: "#795548" };
        return { rank: "D", color: "#9E9E9E" };
    };
    const drawRoundRect = (ctx, x, y, width, height, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };
    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = url;
        });
    };

    const generateImage = async (playerData, bestList, recentList, mode) => {
        await document.fonts.load('bold 20px "Noto Sans JP"');
        await document.fonts.load('20px "Noto Sans JP"');

        updateMessage("背景画像を読み込み中...");
        const BG_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/`;
        const bgUrl = mode === 'vertical' ? `${BG_BASE_URL}bg_portrait.png` : `${BG_BASE_URL}bg_landscape.png`;
        let backgroundImage;
        try {
            backgroundImage = await loadImage(bgUrl);
        } catch (e) {
            console.error("背景画像の読み込みに失敗しました:", e);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const wrapText = (context, text, x, y, maxWidth, lineHeight, align = 'left', maxLines = Infinity) => {
            const words = text.split('');
            let line = '';
            let currentY = y;
            let lineCount = 1;

            const drawLine = (line, y) => {
                let drawX = x;
                if (align === 'center') {
                    const lineWidth = context.measureText(line).width;
                    drawX = x + (maxWidth - lineWidth) / 2;
                }
                context.fillText(line, drawX, y);
            };

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n];
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    if (lineCount >= maxLines) {
                        let truncatedLine = line;
                        while (context.measureText(truncatedLine + '…').width > maxWidth) {
                            truncatedLine = truncatedLine.slice(0, -1);
                        }
                        drawLine(truncatedLine + '…', currentY);
                        return { finalY: currentY, lines: lineCount };
                    }
                    drawLine(line, currentY);
                    line = words[n];
                    currentY += lineHeight;
                    lineCount++;
                } else {
                    line = testLine;
                }
            }
            drawLine(line, currentY);
            return { finalY: currentY, lines: lineCount };
        };

        const calculateAverageRating = (list) => {
            if (!list || list.length === 0) {
                return 0.0;
            }

            const total = list.reduce((sum, song) => sum + (song.rating ?? 0), 0);
            return total / list.length;
        };

        // --- レイアウト定数 ---
        let WIDTH, COLS, BLOCK_WIDTH, CENTER_GAP;
        const PADDING = 30;
        const HEADER_HEIGHT = 280;
        const BLOCK_HEIGHT = 400;
        const FONT_FAMILY = '"Noto Sans JP", sans-serif';

        if (mode === 'vertical') {
            WIDTH = 1920;
            COLS = 8;
            BLOCK_WIDTH = (WIDTH - PADDING * (COLS + 1)) / COLS;
            CENTER_GAP = 50;
        } else { // horizontal
            COLS = 6;
            BLOCK_WIDTH = 210;
            CENTER_GAP = 75;
            const gridWidth = (BLOCK_WIDTH * COLS) + (PADDING * (COLS - 1));
            WIDTH = PADDING + gridWidth + CENTER_GAP + gridWidth + PADDING;
        }
        const JACKET_SIZE = BLOCK_WIDTH * 0.85;

        const calcListHeight = (list, cols) => {
            if (!list.length) return 0;
            const rows = Math.ceil(list.length / cols);
            return 70 + (rows * (BLOCK_HEIGHT + PADDING));
        };

        canvas.width = WIDTH;
        if (mode === 'vertical') {
            canvas.height = HEADER_HEIGHT + calcListHeight(bestList, COLS) + CENTER_GAP + calcListHeight(recentList, COLS) + PADDING;
        } else {
            canvas.height = HEADER_HEIGHT + Math.max(calcListHeight(bestList, COLS), calcListHeight(recentList, COLS)) + PADDING;
        }

        // --- 背景描画 (画像 or フォールバック) ---
        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        } else {
            const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            bgGradient.addColorStop(0, '#1a1a1a');
            bgGradient.addColorStop(1, '#000000');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // --- ヘッダー描画 (新デザイン) ---
        const headerX = PADDING / 2;
        const headerY = PADDING / 2;
        const headerW = WIDTH - PADDING;
        const headerH = HEADER_HEIGHT - PADDING;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        drawRoundRect(ctx, headerX, headerY, headerW, headerH, 15);
        ctx.fill();
        ctx.stroke();

        const leftX = PADDING * 1.5;
        ctx.font = `24px ${FONT_FAMILY}`;
        ctx.fillStyle = '#B0A5C8';
        ctx.fillText('PLAYER NAME', leftX, headerY + 50);

        ctx.font = `bold 64px ${FONT_FAMILY}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowBlur = 15;
        ctx.fillText(playerData.name, leftX, headerY + 125);
        ctx.shadowBlur = 0;

        const now = new Date();
        const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        ctx.font = `28px ${FONT_FAMILY}`;
        ctx.fillStyle = '#D1C4E9';
        ctx.fillText(`Generated at: ${timestamp}`, leftX, headerY + 220);

        const rightX = WIDTH - PADDING * 1.5;
        ctx.textAlign = 'right';

        ctx.font = `bold 32px ${FONT_FAMILY}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`PLAYER RATING`, rightX, headerY + 60);

        ctx.font = `bold 72px ${FONT_FAMILY}`;
        ctx.fillStyle = '#00FFFF';
        ctx.shadowColor = 'rgba(0, 255, 255, 0.9)';
        ctx.shadowBlur = 20;
        const formattedRating = parseFloat(playerData.rating).toFixed(2);
        ctx.fillText(formattedRating, rightX, headerY + 130);
        ctx.shadowBlur = 0;

        const bestAvg = calculateAverageRating(bestList);
        const recentAvg = calculateAverageRating(recentList);
        ctx.font = `bold 24px ${FONT_FAMILY}`;
        ctx.fillStyle = '#D1C4E9';
        ctx.fillText(`BEST Avg: ${bestAvg.toFixed(4)}`, rightX, headerY + 185);
        ctx.fillText(`NEW Avg: ${recentAvg.toFixed(4)}`, rightX, headerY + 220);

        ctx.textAlign = 'left';

        // --- 区切り線を描画 ---
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        if (mode === 'horizontal') {
            const gridWidth = (BLOCK_WIDTH * COLS) + (PADDING * (COLS - 1));
            const lineX = PADDING + gridWidth + (CENTER_GAP / 2);
            ctx.moveTo(lineX, HEADER_HEIGHT + 15);
            ctx.lineTo(lineX, canvas.height - PADDING - 30);
        } else { // vertical
            const lineY = HEADER_HEIGHT + calcListHeight(bestList, COLS) + (CENTER_GAP / 2);
            ctx.moveTo(PADDING, lineY);
            ctx.lineTo(WIDTH - PADDING, lineY);
        }
        ctx.stroke();
        ctx.restore();

        // --- 画像の事前読み込み ---
        updateMessage("ジャケット画像を読み込み中...");
        const allSongs = [...bestList, ...recentList];
        const imagePromises = allSongs.map(song => new Promise(resolve => {
            if (!song.jacketUrl) { resolve({ ...song, image: null }); return; }
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve({ ...song, image: img });
            img.onerror = () => resolve({ ...song, image: null });
            img.src = song.jacketUrl.replace('http://', 'https://');
        }));
        const songsWithImages = await Promise.all(imagePromises);

        // --- 楽曲リスト描画関数 ---
        const renderSongList = (title, list, startX, startY, cols, blockWidth) => {
            ctx.font = `bold 38px ${FONT_FAMILY}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText(title, startX, startY + 45);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            list.forEach((song, i) => {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = startX + col * (blockWidth + PADDING);
                const y = startY + 70 + row * (BLOCK_HEIGHT + PADDING);

                const difficultyInfo = {
                    ULTIMA: { bg: 'linear-gradient(135deg, #a00, #310000)' },
                    MASTER: { bg: '#8A2BE2' }, EXPERT: { bg: '#ff1100ff' },
                    ADVANCED: { bg: '#FDD835' }, BASIC: { bg: '#7CB342' },
                    UNKNOWN: { bg: '#9E9E9E' }
                };
                const diffStyle = difficultyInfo[song.difficulty] || difficultyInfo.UNKNOWN;
                // カード背景
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.strokeStyle = diffStyle.bg;
                ctx.lineWidth = 1;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                drawRoundRect(ctx, x, y, blockWidth, BLOCK_HEIGHT, 15);
                ctx.fill();
                ctx.stroke();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // ジャケット
                const jacket_x = x + (blockWidth - JACKET_SIZE) / 2;
                const jacket_y = y + 20;
                if (song.image) {
                    ctx.save();
                    drawRoundRect(ctx, jacket_x, jacket_y, JACKET_SIZE, JACKET_SIZE, 10);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.clip();
                    ctx.drawImage(song.image, jacket_x, jacket_y, JACKET_SIZE, JACKET_SIZE);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#222';
                    drawRoundRect(ctx, jacket_x, jacket_y, JACKET_SIZE, JACKET_SIZE, 10);
                    ctx.fill();
                }

                // ジャケット右上の番号と難易度帯
                const numberText = `#${i + 1}`;
                ctx.font = `bold 30px ${FONT_FAMILY}`;
                const textMetrics = ctx.measureText(numberText);
                const textWidth = textMetrics.width;
                const ribbonHeight = 38;
                const ribbonWidth = textWidth + 20;
                const ribbonX = jacket_x + JACKET_SIZE - ribbonWidth - 5;
                const ribbonY = jacket_y + 5;

                ctx.save();
                if (song.difficulty === 'ULTIMA') {
                    const grad = ctx.createLinearGradient(ribbonX, ribbonY, ribbonX + ribbonWidth, ribbonY);
                    grad.addColorStop(0, '#a00'); grad.addColorStop(1, '#1a1a1a');
                    ctx.fillStyle = grad;
                } else { ctx.fillStyle = diffStyle.bg; }
                drawRoundRect(ctx, ribbonX, ribbonY, ribbonWidth, ribbonHeight, 8);
                ctx.fill();
                ctx.restore();

                ctx.textAlign = 'right';
                ctx.lineJoin = 'round';
                const numberX = ribbonX + ribbonWidth - 10;
                const numberY = ribbonY + ribbonHeight - 8;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 6;
                ctx.strokeText(numberText, numberX, numberY);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(numberText, numberX, numberY);
                ctx.textAlign = 'left';
                ctx.lineWidth = 1;

                // テキスト描画
                let current_y = jacket_y + JACKET_SIZE + 30;
                const text_x_padded = x + 15;
                const text_width = blockWidth - 30;
                const titleLineHeight = 22;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold 17px ${FONT_FAMILY}`;
                const titleInfo = wrapText(ctx, song.title, text_x_padded, current_y, text_width, titleLineHeight, 'center', 2);
                current_y = titleInfo.finalY + (titleInfo.lines === 1 ? titleLineHeight : 0);
                current_y += 28;

                // スコアとランク
                const rankInfo = getRankInfo(song.score_int);
                const scoreText = song.score_str;
                const rankText = `[${rankInfo.rank}]`;
                const gap = 8;
                ctx.font = `bold 24px ${FONT_FAMILY}`;
                const scoreWidth = ctx.measureText(scoreText).width;
                ctx.font = `bold 16px ${FONT_FAMILY}`;
                const rankWidth = ctx.measureText(rankText).width;
                const totalWidth = scoreWidth + gap + rankWidth;
                const score_x = x + (blockWidth - totalWidth) / 2;
                if (rankInfo.rank === "SSS+" || rankInfo.rank === "SSS") {
                    ctx.shadowColor = rankInfo.color;
                    ctx.shadowBlur = 10;
                }
                ctx.font = `bold 24px ${FONT_FAMILY}`;
                ctx.fillStyle = rankInfo.color;
                ctx.fillText(scoreText, score_x, current_y);
                ctx.font = `bold 16px ${FONT_FAMILY}`;
                ctx.fillText(rankText, score_x + scoreWidth + gap, current_y);
                ctx.shadowBlur = 0;
                current_y += 38;

                // データ行
                const drawDataRow = (label, value, y_pos, valueColor = '#FFFFFF', valueFont = `bold 18px ${FONT_FAMILY}`) => {
                    ctx.font = `16px ${FONT_FAMILY}`;
                    ctx.fillStyle = '#B0A5C8';
                    ctx.fillText(label, text_x_padded, y_pos);
                    ctx.textAlign = 'right';
                    ctx.font = valueFont;
                    ctx.fillStyle = valueColor;
                    ctx.fillText(value, x + blockWidth - 15, y_pos);
                    ctx.textAlign = 'left';
                };
                drawDataRow('CONST', song.const ? song.const.toFixed(2) : 'N/A', current_y);
                current_y += 30;
                drawDataRow('プレイ回数', song.playCount || 'N/A', current_y);
                current_y += 32;
                drawDataRow('RATING', song.rating.toFixed(2), current_y, '#81D4FA', `bold 22px ${FONT_FAMILY}`);
            });
        };

        if (mode === 'vertical') {
            const bestStartY = HEADER_HEIGHT;
            const recentStartY = bestStartY + calcListHeight(bestList, COLS) + CENTER_GAP;
            renderSongList("BEST", songsWithImages.slice(0, bestList.length), PADDING, bestStartY, COLS, BLOCK_WIDTH);
            renderSongList("NEW", songsWithImages.slice(bestList.length), PADDING, recentStartY, COLS, BLOCK_WIDTH);
        } else { // horizontal
            const listsStartY = HEADER_HEIGHT;
            const bestStartX = PADDING;
            const gridWidth = (BLOCK_WIDTH * COLS) + (PADDING * (COLS - 1));
            const recentStartX = PADDING + gridWidth + CENTER_GAP;
            renderSongList("BEST", songsWithImages.slice(0, bestList.length), bestStartX, listsStartY, COLS, BLOCK_WIDTH);
            renderSongList("NEW", songsWithImages.slice(bestList.length), recentStartX, listsStartY, COLS, BLOCK_WIDTH);
        }

        // --- フッター描画 ---
        const footerFontSize = 40;
        const lineHeight = 52;

        ctx.font = `bold ${footerFontSize}px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(71, 71, 71, 0.7)';
        ctx.textAlign = 'right';

        const footerX = canvas.width - PADDING;
        const secondLineY = canvas.height - PADDING + 10;
        const firstLineY = secondLineY - lineHeight;

        ctx.fillText('CHUNITHM-EXTERNAL-TOOLS', footerX, firstLineY);
        ctx.fillText('Dev.: SHALN-BF (Fuyant, Aut.)', footerX, secondLineY);

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const generateGraphImage = async (playerData, bestList, recentList, mode) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const isVertical = mode === 'vertical';
        const rowHeight = isVertical ? 50 : 45;
        const baseTitleAreaWidth = isVertical ? 280 : 350;
        const baseGraphAreaWidth = isVertical ? 590 : 1000;
        const marginLeft = Math.round(baseTitleAreaWidth * 1.2);
        const graphWidth = Math.round(baseGraphAreaWidth * 1.2);
        const marginRight = 50;
        const width = marginLeft + graphWidth + marginRight;
        const statsPanelHeight = 170;
        const height = (isVertical ? 200 : 170) + (bestList.length * rowHeight) + 100 + (recentList.length * rowHeight) + 110 + statsPanelHeight;
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, width, height);

        const overallRating = Number(playerData.rating);
        const allSongs = [...bestList, ...recentList];
        const ratingPoints = [overallRating];
        allSongs.forEach(song => {
            ratingPoints.push(Number(song.rating));
            ratingPoints.push(Number(song.const || 0) + 2.15);
        });

        let minRating = Math.min(...ratingPoints);
        let maxRating = Math.max(...ratingPoints);
        let ratingRange = maxRating - minRating;

        if (!Number.isFinite(minRating) || !Number.isFinite(maxRating)) {
            minRating = 0;
            maxRating = 1;
            ratingRange = 1;
        } else if (ratingRange === 0) {
            minRating -= 0.5;
            maxRating += 0.5;
            ratingRange = 1;
        } else {
            const axisMargin = Math.max(0.02, ratingRange * 0.015);
            minRating -= axisMargin;
            maxRating += axisMargin;
            ratingRange = maxRating - minRating;
        }

        const calcRatingStats = (ratings) => {
            const values = ratings.filter(v => Number.isFinite(v));
            if (values.length === 0) {
                return { avg: 0, std: 0 };
            }
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            const variance = values.reduce((sum, v) => sum + ((v - avg) ** 2), 0) / values.length;
            return { avg, std: Math.sqrt(variance) };
        };

        const bestRatings = bestList.map(song => Number(song.rating));
        const recentRatings = recentList.map(song => Number(song.rating));
        const allRatings = [...bestRatings, ...recentRatings, overallRating];

        const bestStats = calcRatingStats(bestRatings);
        const recentStats = calcRatingStats(recentRatings);
        const allStats = calcRatingStats(allRatings);
        const bestMinRating = bestRatings.length > 0 ? Math.min(...bestRatings) : 0;
        const recentMinRating = recentRatings.length > 0 ? Math.min(...recentRatings) : 0;
        const bestConstLowerBound = bestMinRating - 2.15;
        const recentConstLowerBound = recentMinRating - 2.15;

        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 38px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('CHUNITHM BEST/RECENT GRAPH', 50, 34);
        ctx.font = 'bold 30px "Noto Sans JP", sans-serif';
        ctx.fillText(`${playerData.name}`, 50, 82);
        ctx.fillText(`Rating: ${playerData.rating}`, 50, 122);

        const plotX = (val) => {
            const normalized = (val - minRating) / (maxRating - minRating);
            return marginLeft + Math.max(0, Math.min(1, normalized)) * graphWidth;
        };

        const truncateTextToWidth = (text, maxWidth) => {
            if (ctx.measureText(text).width <= maxWidth) return text;
            let clipped = text;
            while (clipped.length > 0 && ctx.measureText(clipped + '...').width > maxWidth) {
                clipped = clipped.slice(0, -1);
            }
            return clipped + '...';
        };

        ctx.font = '20px Arial';
        ctx.fillStyle = "#888888";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const tickStep = ratingRange <= 4 ? 0.25 : (ratingRange <= 8 ? 0.5 : 1.0);
        const tickDecimals = tickStep < 1 ? 2 : 1;
        const tickStart = Math.ceil(minRating / tickStep) * tickStep;
        for (let r = tickStart; r <= maxRating + 1e-9; r += tickStep) {
            const x = plotX(r);
            ctx.beginPath();
            ctx.moveTo(x, 120);
            ctx.lineTo(x, height - 50);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillText(r.toFixed(tickDecimals), x, 140);
        }

        let currentY = isVertical ? 220 : 200;

        const drawSection = (title, list) => {
            ctx.fillStyle = "#ffffff";
            ctx.font = 'bold 30px "Noto Sans JP", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(title, 50, currentY);
            currentY += 50;

            for (let i = 0; i < list.length; i++) {
                const song = list[i];
                const songConst = song.const || 0;
                const sssPlus = (song.const || 0) + 2.15;

                ctx.fillStyle = "#ffffff";
                ctx.font = '22px "Noto Sans JP", sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';

                const labelMaxWidth = marginLeft - 30;
                const labelText = `${songConst.toFixed(2)} | ${song.title}`;
                const displayTitle = truncateTextToWidth(labelText, labelMaxWidth);
                ctx.fillText(displayTitle, 20, currentY + 15);

                const xBase = marginLeft;
                const xConst = plotX(songConst);
                const xConstPlusOne = plotX(songConst + 1);
                const xSSSPlus = plotX(sssPlus);
                const xRating = plotX(song.rating);
                const isAtTheoretical = song.rating >= (sssPlus - 1e-6);

                const diffColors = {
                    'MAS': { light: 'rgba(156, 39, 176, 0.4)', dark: 'rgba(156, 39, 176, 1)' },
                    'EXP': { light: 'rgba(244, 67, 54, 0.4)', dark: 'rgba(244, 67, 54, 1)' },
                    'ULT': { light: 'rgba(120, 18, 18, 0.45)', dark: 'rgba(245, 82, 82, 1)' },
                    'ADV': { light: 'rgba(255, 152, 0, 0.4)', dark: 'rgba(255, 152, 0, 1)' },
                    'BAS': { light: 'rgba(76, 175, 80, 0.4)', dark: 'rgba(76, 175, 80, 1)' }
                };
                const diffAbbr = song.difficulty === 'MASTER' ? 'MAS' :
                    song.difficulty === 'EXPERT' ? 'EXP' :
                        song.difficulty === 'ULTIMA' ? 'ULT' :
                            song.difficulty === 'ADVANCED' ? 'ADV' : 'BAS';

                const colorSet = diffColors[diffAbbr] || { light: 'rgba(100,100,100,0.5)', dark: 'rgba(200,200,200,1)' };

                const barHeight = isVertical ? 30 : 26;
                const barY = currentY + 15 - barHeight / 2;

                ctx.fillStyle = colorSet.light;
                ctx.fillRect(xBase, barY, xSSSPlus - xBase, barHeight);

                ctx.fillStyle = colorSet.dark;
                ctx.fillRect(xBase, barY, xRating - xBase, barHeight);

                ctx.strokeStyle = 'rgba(120, 200, 255, 0.95)';
                ctx.lineWidth = 3.6;
                ctx.beginPath();
                ctx.moveTo(xConst, barY - 5);
                ctx.lineTo(xConst, barY + barHeight + 5);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(255, 220, 120, 0.95)';
                ctx.lineWidth = 3.6;
                ctx.beginPath();
                ctx.moveTo(xConstPlusOne, barY - 5);
                ctx.lineTo(xConstPlusOne, barY + barHeight + 5);
                ctx.stroke();

                const stripeHeight = barHeight * (5 / 7);
                const stripeY = barY + ((barHeight - stripeHeight) / 2);
                const stripeEndX = Math.max(xBase, Math.min(xRating, xSSSPlus));
                const stripeWidth = Math.max(0, stripeEndX - xBase);

                if (isAtTheoretical) {
                    const rainbowGradient = ctx.createLinearGradient(xBase, 0, xSSSPlus, 0);
                    rainbowGradient.addColorStop(0.00, 'rgba(255, 64, 64, 0.95)');
                    rainbowGradient.addColorStop(0.17, 'rgba(255, 160, 64, 0.95)');
                    rainbowGradient.addColorStop(0.34, 'rgba(255, 235, 64, 0.95)');
                    rainbowGradient.addColorStop(0.51, 'rgba(64, 220, 96, 0.95)');
                    rainbowGradient.addColorStop(0.68, 'rgba(64, 170, 255, 0.95)');
                    rainbowGradient.addColorStop(0.85, 'rgba(120, 120, 255, 0.95)');
                    rainbowGradient.addColorStop(1.00, 'rgba(190, 90, 255, 0.95)');
                    ctx.fillStyle = rainbowGradient;
                } else {
                    ctx.fillStyle = colorSet.dark;
                }
                ctx.fillRect(xBase, stripeY, stripeWidth, stripeHeight);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.moveTo(xRating, barY - 5);
                ctx.lineTo(xRating, barY + barHeight + 5);
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.font = '16px Arial';
                ctx.textBaseline = 'middle';

                const currentLabelText = `${song.rating.toFixed(2)}`;
                const maxLabelText = `${sssPlus.toFixed(2)}`;
                const baseLabelY = currentY + 15;
                const maxLabelW = ctx.measureText(maxLabelText).width;

                const currentLabelX = Math.max(xBase + 48, xRating - 8);
                const maxLabelNaturalX = xSSSPlus + 8;
                const maxLabelLimitX = width - 12;
                let maxLabelAlign = 'left';
                let maxLabelX = maxLabelNaturalX;
                if (maxLabelNaturalX + maxLabelW > maxLabelLimitX) {
                    maxLabelAlign = 'right';
                    maxLabelX = maxLabelLimitX;
                }

                if (!isAtTheoretical) {
                    ctx.textAlign = 'right';
                    ctx.fillText(currentLabelText, currentLabelX, baseLabelY);
                }

                if (maxLabelAlign === 'left') {
                    ctx.textAlign = 'left';
                    ctx.fillText(maxLabelText, maxLabelX, baseLabelY);
                } else {
                    ctx.textAlign = 'right';
                    ctx.fillText(maxLabelText, maxLabelX, baseLabelY);
                }

                currentY += rowHeight;
            }
        };

        drawSection("BEST枠", bestList);
        currentY += 40;
        drawSection("新曲枠", recentList);

        const xOverall = plotX(overallRating);
        ctx.beginPath();
        ctx.moveTo(xOverall, 150);
        ctx.lineTo(xOverall, currentY);
        ctx.strokeStyle = "#FFFF00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#FFFF00";
        ctx.font = 'bold 20px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`現在レート: ${overallRating.toFixed(2)}`, xOverall, currentY + 20);

        const statsBoxWidth = isVertical ? Math.min(width - 52, 760) : Math.min(width - 52, 960);
        const statsBoxHeight = 160;
        const statsLineHeight = 28;
        const statsX = 26;
        const statsY = height - statsBoxHeight - 24;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.fillRect(statsX, statsY, statsBoxWidth, statsBoxHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = 1;
        ctx.strokeRect(statsX, statsY, statsBoxWidth, statsBoxHeight);

        ctx.fillStyle = '#D8E9FF';
        ctx.font = 'bold 22px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('統計', statsX + 14, statsY + 8);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px "Noto Sans JP", sans-serif';
        ctx.fillText(`BEST平均RATING: ${bestStats.avg.toFixed(4)} / 標準偏差: ${bestStats.std.toFixed(4)}`, statsX + 14, statsY + 38);
        ctx.fillText(`新曲平均RATING: ${recentStats.avg.toFixed(4)} / 標準偏差: ${recentStats.std.toFixed(4)}`, statsX + 14, statsY + 38 + statsLineHeight);
        ctx.fillText(`全体標準偏差(現在レート込): ${allStats.std.toFixed(4)}  |  現在レート: ${overallRating.toFixed(4)}`, statsX + 14, statsY + 38 + (statsLineHeight * 2));
        ctx.fillText(`更新関与の定数下限(BEST/新曲): ${bestConstLowerBound.toFixed(4)} / ${recentConstLowerBound.toFixed(4)}`, statsX + 14, statsY + 38 + (statsLineHeight * 3));

        return canvas.toDataURL('image/png');
    };

    const showGeneratedImages = (listDataUrl, graphDataUrl) => {
        const currentOverlay = document.querySelector('div[style*="z-index: 9999"]');
        if (!currentOverlay) return;

        currentOverlay.innerHTML = '';
        currentOverlay.style.alignItems = 'center';
        currentOverlay.style.overflowY = 'auto';

        const resultContainer = document.createElement('div');
        resultContainer.style.cssText = `
            background-color: rgba(30, 30, 45, 0.95);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            width: min(95vw, 1300px);
        `;

        const title = document.createElement('h2');
        title.textContent = '生成完了！';
        title.style.cssText = 'font-size: 24px; font-weight: bold; color: #E0E0E0; margin: 0;';

        const imagesWrapper = document.createElement('div');
        imagesWrapper.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 18px; width: 100%;';

        const createImageCard = (cardTitle, dataUrl, filenamePrefix) => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(0, 0, 0, 0.25); border-radius: 12px; padding: 14px;';

            const heading = document.createElement('h3');
            heading.textContent = cardTitle;
            heading.style.cssText = 'margin: 0 0 10px 0; color: #fff; font-size: 18px;';

            const imageArea = document.createElement('div');
            imageArea.style.cssText = 'max-height: 42vh; overflow: auto; border-radius: 10px;';

            const image = document.createElement('img');
            image.src = dataUrl;
            image.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 8px;';
            imageArea.appendChild(image);

            const saveButton = document.createElement('button');
            saveButton.textContent = `${cardTitle}を保存`;
            saveButton.style.cssText = `
                margin-top: 10px;
                padding: 10px 16px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
            `;
            saveButton.onclick = () => {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `${filenamePrefix}-${Date.now()}.png`;
                a.click();
            };

            card.appendChild(heading);
            card.appendChild(imageArea);
            card.appendChild(saveButton);
            return card;
        };

        imagesWrapper.appendChild(createImageCard('リスト画像', listDataUrl, 'chunithm-rating'));
        imagesWrapper.appendChild(createImageCard('グラフ画像', graphDataUrl, 'chunithm-graph'));

        const closeButton = document.createElement('button');
        closeButton.textContent = '閉じる';
        closeButton.style.cssText = `
            padding: 12px 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 8px;
        `;
        closeButton.onclick = () => document.body.removeChild(currentOverlay);

        resultContainer.appendChild(title);
        resultContainer.appendChild(imagesWrapper);
        resultContainer.appendChild(closeButton);
        currentOverlay.appendChild(resultContainer);
        currentOverlay.appendChild(globalCloseButton);
    };

    // --- メイン処理 ---
    try {
        const { mode, delay, scanMode, bestConstThreshold, newConstThreshold } = await askForSettings();

        if (isAborted) return;

        overlay.innerHTML = '';

        message.style.cssText = `
            width: 500px; text-align: center;
            animation: fadeIn 0.5s;
        `;
        message.innerHTML = `
            <p class="progress-text" style="font-size: 20px; color: #E0E0E0; transition: opacity 0.2s;">
                準備中...
            </p>
            <div class="progress-bar" style="width: 100%; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 15px; overflow: hidden;">
                <div class="progress-bar-inner" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4A90E2, #81D4FA); border-radius: 5px; transition: width 0.5s ease-out;"></div>
            </div>
        `;
        overlay.appendChild(message);
        overlay.appendChild(globalCloseButton);

        updateMessage("プレイヤー情報を取得中...", 5);
        const playerDoc = await fetchDocument(URL_PLAYER_DATA);
        if (isAborted) return;

        let ratingString = '';
        const ratingImages = playerDoc.querySelectorAll('.player_rating_num_block img');
        ratingImages.forEach(img => {
            const src = img.src;
            const lastChar = src.charAt(src.length - 5);
            ratingString += (lastChar === 'a') ? '.' : lastChar;
        });

        const playerData = {
            name: playerDoc.querySelector('.player_name_in').innerText,
            rating: ratingString,
        };

        updateMessage("譜面定数データをダウンロード中...", 10);
        const constData = await fetch(CONST_DATA_URL).then(res => res.json());
        console.log("定数データを取得:", constData);
        const constMap = new Map();
        constData.forEach(entry => {
            const key = `${normalizeTitle(entry.title)}|${entry.diff}`;
            if (!constMap.has(key)) {
                constMap.set(key, entry.const);
            }
        });
        if (isAborted) return;

        let finalBestList = [];
        let finalRecentList = [];

        if (scanMode === 'free') {
            updateMessage('無料モード: ランキング経由で曲データを取得中...', 12);
            const result = await fetchAllSongsForFreeUser(bestConstThreshold, newConstThreshold, delay, constData);
            if (isAborted || !result) return;

            const { detailedNewSongs, detailedOldSongs } = result;

            updateMessage('レーティングを計算中...', 96);
            detailedNewSongs.forEach(song => {
                song.rating = calculateRating(song.score_int, song.const);
            });
            detailedOldSongs.forEach(song => {
                song.rating = calculateRating(song.score_int, song.const);
            });

            detailedNewSongs.sort((a, b) => b.rating - a.rating);
            detailedOldSongs.sort((a, b) => b.rating - a.rating);

            finalBestList = detailedOldSongs.slice(0, 30);
            finalRecentList = detailedNewSongs.slice(0, 20);
        } else {
            const detailedSongs = [];
            updateMessage('BEST枠の曲リストを取得中...', 15);
            const bestList = await scrapeRatingList(URL_RATING_BEST);
            if (isAborted) return;

            updateMessage('新曲枠の曲リストを取得中...', 20);
            const recentList = await scrapeRatingList(URL_RATING_RECENT);
            if (isAborted) return;

            const allSongs = [...bestList, ...recentList];

            for (let i = 0; i < allSongs.length; i++) {
                if (isAborted) break;
                const song = allSongs[i];
                const progress = 20 + (i / allSongs.length) * 80;

                if (i > 0 && delay > 0) {
                    updateMessage(`待機中... (${delay.toFixed(2)}秒) - (${i}/${allSongs.length})`, progress);
                    await sleep(delay * 1000);
                }

                if (isAborted) break;

                updateMessage(`楽曲詳細を取得中: ${song.title} (${i + 1}/${allSongs.length})`, progress);
                const details = await scrapeMusicDetail(song.params);

                const difficultyMapToJson = { MASTER: 'MAS', EXPERT: 'EXP', ULTIMA: 'ULT', ADVANCED: 'ADV', BASIC: 'BAS' };
                const diffAbbreviation = difficultyMapToJson[song.difficulty];
                const songKey = `${normalizeTitle(song.title)}|${diffAbbreviation}`;
                const matchedConst = constMap.get(songKey);
                const rating = calculateRating(song.score_int, matchedConst);

                detailedSongs.push({ ...song, ...details, const: matchedConst || 0.0, rating });
            }
            if (isAborted) return;

            finalBestList = detailedSongs.slice(0, bestList.length);
            finalRecentList = detailedSongs.slice(bestList.length);
        }

        updateMessage('リスト画像を生成中...', 97);
        const listDataUrl = await generateImage(playerData, finalBestList, finalRecentList, mode);
        if (isAborted) return;

        updateMessage('グラフ画像を生成中...', 99);
        const graphDataUrl = await generateGraphImage(playerData, finalBestList, finalRecentList, mode);
        if (isAborted) return;

        showGeneratedImages(listDataUrl, graphDataUrl);

    } catch (error) {
        if (isAborted) {
            return;
        }
        showError(error.message);
    }
})();