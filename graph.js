(async function () {
    'use strict';
    //const CURRENT_VERSION = "X-VERSE";

    const GITHUB_USER = "SHALN-BF";
    const GITHUB_REPO = "chunithm-external-tools";
    const CONST_DATA_URL = `https://reiwa.f5.si/chunithm_record.json`;

    const BASE_URL = "https://new.chunithm-net.com/chuni-mobile/html/mobile/";
    const URL_PLAYER_DATA = BASE_URL + "home/playerData/";
    const URL_RATING_BEST = URL_PLAYER_DATA + "ratingDetailBest/";
    const URL_RATING_RECENT = URL_PLAYER_DATA + "ratingDetailRecent/";
    const URL_SEND_DETAIL = BASE_URL + "record/musicGenre/sendMusicDetail/";
    const URL_DETAIL = BASE_URL + "record/musicDetail/";

    let isAborted = false;

    const overlay = document.createElement('div');
    const message = document.createElement('div');
    const globalCloseButton = document.createElement('button');

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
     * @returns {Promise<{mode: string, delay: number}>} - 選択された設定を解決するPromise
     */
    const askForSettings = () => {
        return new Promise(resolve => {
            let selectedMode = null;
            let scrapeDelay = 1.0;

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
            subtitle.innerHTML = '画像レイアウトと取得間隔を設定してください';
            subtitle.style.cssText = 'font-size: 16px; margin-bottom: 30px; color: #B0B0B0;';
            container.appendChild(subtitle);

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
                if (selectedMode) {
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
                if (selectedMode) {
                    resolve({ mode: selectedMode, delay: scrapeDelay });
                }
            };
            container.appendChild(generateButton);

            overlay.innerHTML = '';
            overlay.appendChild(container);
            overlay.appendChild(globalCloseButton);
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
        updateMessage("グラフを生成中...");

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

        // Fill background
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, width, height);

        const overallRating = Number(playerData.rating);

        // Calculate rating extremes for X-axis from actual rating values.
        // Includes song current rating, song SSS+ rating, and player's current overall rating.
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
            // Keep a small visual margin while preserving min/max-based scaling.
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

        // Draw Title
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 38px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('CHUNITHM BEST/RECENT GRAPH', 50, 34);
        ctx.font = 'bold 30px "Noto Sans JP", sans-serif';
        ctx.fillText(`${playerData.name}`, 50, 82);
        ctx.fillText(`Rating: ${playerData.rating}`, 50, 122);

        const plotX = (val) => {
            let normalized = (val - minRating) / (maxRating - minRating);
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

        // Draw Grid Lines
        ctx.font = '20px Arial';
        ctx.fillStyle = "#888888";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const tickStep = ratingRange <= 4 ? 0.25 : (ratingRange <= 8 ? 0.5 : 1.0);
        const tickDecimals = tickStep < 1 ? 2 : 1;
        const tickStart = Math.ceil(minRating / tickStep) * tickStep;
        for (let r = tickStart; r <= maxRating + 1e-9; r += tickStep) {
            let x = plotX(r);
            ctx.beginPath();
            ctx.moveTo(x, 120);
            ctx.lineTo(x, height - 50);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillText(r.toFixed(tickDecimals), x, 140);
        }

        // Process lists
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

                // Draw text (Title & Diff)
                ctx.fillStyle = "#ffffff";
                ctx.font = '22px "Noto Sans JP", sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';

                const labelMaxWidth = marginLeft - 30;
                const labelText = `${i + 1}. ${song.title}`;
                const displayTitle = truncateTextToWidth(labelText, labelMaxWidth);
                ctx.fillText(displayTitle, 20, currentY + 15);

                // X coordinates
                const xBase = marginLeft;
                const xConst = plotX(songConst);
                const xConstPlusOne = plotX(songConst + 1);
                const xSSSPlus = plotX(sssPlus);
                const xRating = plotX(song.rating);
                const isAtTheoretical = song.rating >= (sssPlus - 1e-6);

                // Draw SSS+ bar (Light Color)
                const diffColors = {
                    'MAS': { light: 'rgba(156, 39, 176, 0.4)', dark: 'rgba(156, 39, 176, 1)' },
                    'EXP': { light: 'rgba(244, 67, 54, 0.4)', dark: 'rgba(244, 67, 54, 1)' },
                    'ULT': { light: 'rgba(0, 0, 0, 0.4)', dark: 'rgba(200, 200, 200, 1)' },
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

                // SSS+ (Light)
                ctx.fillStyle = colorSet.light;
                ctx.fillRect(xBase, barY, xSSSPlus - xBase, barHeight);

                // Current (Dark)
                ctx.fillStyle = colorSet.dark;
                ctx.fillRect(xBase, barY, xRating - xBase, barHeight);

                // Hypothetical SSS+ stripe (rainbow, centered, 3/7 bar thickness)
                const rainbowHeight = barHeight * (3 / 7);
                const rainbowY = barY + ((barHeight - rainbowHeight) / 2);
                const rainbowGradient = ctx.createLinearGradient(xBase, 0, xSSSPlus, 0);
                rainbowGradient.addColorStop(0.00, 'rgba(255, 64, 64, 0.95)');
                rainbowGradient.addColorStop(0.17, 'rgba(255, 160, 64, 0.95)');
                rainbowGradient.addColorStop(0.34, 'rgba(255, 235, 64, 0.95)');
                rainbowGradient.addColorStop(0.51, 'rgba(64, 220, 96, 0.95)');
                rainbowGradient.addColorStop(0.68, 'rgba(64, 170, 255, 0.95)');
                rainbowGradient.addColorStop(0.85, 'rgba(120, 120, 255, 0.95)');
                rainbowGradient.addColorStop(1.00, 'rgba(190, 90, 255, 0.95)');
                ctx.fillStyle = rainbowGradient;
                ctx.fillRect(xBase, rainbowY, Math.max(0, xSSSPlus - xBase), rainbowHeight);

                // Highlight constant anchors (top-most, thicker)
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

                // Current rating marker (always keep)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.moveTo(xRating, barY - 5);
                ctx.lineTo(xRating, barY + barHeight + 5);
                ctx.stroke();

                // If current rating reaches SSS+ theoretical value, add rainbow glow
                if (isAtTheoretical) {
                    const glowGradient = ctx.createLinearGradient(0, barY - 7, 0, barY + barHeight + 7);
                    glowGradient.addColorStop(0.00, 'rgba(255, 64, 64, 0.95)');
                    glowGradient.addColorStop(0.17, 'rgba(255, 160, 64, 0.95)');
                    glowGradient.addColorStop(0.34, 'rgba(255, 235, 64, 0.95)');
                    glowGradient.addColorStop(0.51, 'rgba(64, 220, 96, 0.95)');
                    glowGradient.addColorStop(0.68, 'rgba(64, 170, 255, 0.95)');
                    glowGradient.addColorStop(0.85, 'rgba(120, 120, 255, 0.95)');
                    glowGradient.addColorStop(1.00, 'rgba(190, 90, 255, 0.95)');

                    ctx.save();
                    ctx.strokeStyle = glowGradient;
                    ctx.lineWidth = 6.2;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(xRating, barY - 7);
                    ctx.lineTo(xRating, barY + barHeight + 7);
                    ctx.stroke();
                    ctx.restore();
                }

                // Value text
                ctx.fillStyle = "#ffffff";
                ctx.font = '16px Arial';
                ctx.textBaseline = 'middle';

                const currentLabelText = `${song.rating.toFixed(2)}`;
                const maxLabelText = `${sssPlus.toFixed(2)}`;
                const baseLabelY = currentY + 15;
                let currentLabelY = baseLabelY;
                let maxLabelY = baseLabelY;

                const currentLabelW = ctx.measureText(currentLabelText).width;
                const maxLabelW = ctx.measureText(maxLabelText).width;

                // Current rating label: left side of current marker
                let currentLabelX = Math.max(xBase + 48, xRating - 8);

                // Max(theoretical SSS+) label: right side of theoretical marker
                const maxLabelNaturalX = xSSSPlus + 8;
                const maxLabelLimitX = width - 12;
                let maxLabelAlign = 'left';
                let maxLabelX = maxLabelNaturalX;
                if (maxLabelNaturalX + maxLabelW > maxLabelLimitX) {
                    maxLabelAlign = 'right';
                    maxLabelX = maxLabelLimitX;
                }

                const currentLeft = currentLabelX - currentLabelW;
                const currentRight = currentLabelX;
                const maxLeft = maxLabelAlign === 'left' ? maxLabelX : (maxLabelX - maxLabelW);
                const maxRight = maxLabelAlign === 'left' ? (maxLabelX + maxLabelW) : maxLabelX;
                const labelsOverlap = !(currentRight < maxLeft || maxRight < currentLeft);

                if (!isAtTheoretical && labelsOverlap) {
                    // When labels are crowded, separate them vertically to avoid overlap.
                    currentLabelY = baseLabelY - 9;
                    maxLabelY = baseLabelY + 9;
                }

                if (!isAtTheoretical) {
                    ctx.textAlign = 'right';
                    ctx.fillText(currentLabelText, currentLabelX, currentLabelY);
                }

                if (maxLabelAlign === 'left') {
                    ctx.textAlign = 'left';
                    ctx.fillText(maxLabelText, maxLabelX, maxLabelY);
                } else {
                    ctx.textAlign = 'right';
                    ctx.fillText(maxLabelText, maxLabelX, maxLabelY);
                }

                currentY += rowHeight;
            }
        };

        drawSection("BEST枠", bestList);
        currentY += 40;
        drawSection("新曲枠", recentList);

        // Draw overall rating line
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
        const statsBoxHeight = 132;
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

        // Display image logic
        const dataUrl = canvas.toDataURL('image/png');

        const resultImage = document.createElement('img');
        resultImage.src = dataUrl;
        resultImage.style.cssText = 'width: auto; max-width: none; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: block; margin: 0 auto;';

        const currentOverlay = document.querySelector('div[style*="top: 0px;"]');
        if (currentOverlay) {
            currentOverlay.innerHTML = '';
            currentOverlay.style.overflow = 'auto';
            currentOverlay.style.justifyContent = 'flex-start';
            currentOverlay.style.paddingTop = '50px';
            currentOverlay.style.paddingBottom = '50px';

            const resultContainer = document.createElement('div');
            resultContainer.style.cssText = `width: 95%; max-width: ${width + 120}px; background: #2d2d2d; color: #fff; padding: 20px; border-radius: 15px; text-align: center; position: relative; margin: 0 auto;`;

            const title = document.createElement('h2');
            title.innerText = 'グラフ生成完了！';
            title.style.cssText = 'color: #fff; margin-bottom: 20px; font-family: sans-serif; margin-top: 0; padding-top: 20px;';

            const imageScrollArea = document.createElement('div');
            imageScrollArea.style.cssText = 'max-height: 75vh; overflow: auto; padding: 8px; border-radius: 12px; background: rgba(0,0,0,0.2);';
            imageScrollArea.appendChild(resultImage);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'margin-top: 20px; display: flex; justify-content: center; gap: 15px;';

            const createActionButton = (text, bgColor) => {
                const btn = document.createElement('button');
                btn.innerText = text;
                btn.style.cssText = `padding: 10px 20px; border: none; border-radius: 20px; background-color: ${bgColor}; color: white; cursor: pointer; font-size: 16px; font-weight: bold; transition: opacity 0.2s;`;
                btn.onmouseover = () => btn.style.opacity = '0.8';
                btn.onmouseout = () => btn.style.opacity = '1';
                return btn;
            };

            const saveButton = createActionButton('画像を保存', '#4CAF50');
            saveButton.onclick = () => {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `chunithm-graph-${Date.now()}.png`;
                a.click();
            };

            const closeButton = createActionButton('閉じる', '#f44336');
            closeButton.onclick = () => document.body.removeChild(currentOverlay);

            buttonContainer.appendChild(saveButton);
            buttonContainer.appendChild(closeButton);
            resultContainer.appendChild(title);
            resultContainer.appendChild(imageScrollArea);
            resultContainer.appendChild(buttonContainer);
            currentOverlay.appendChild(resultContainer);
        }
    };

    // --- メイン処理 ---

    // --- メイン処理 ---
    try {
        const { mode, delay } = await askForSettings();

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

        let detailedSongs = [];
        updateMessage("BEST枠の曲リストを取得中...", 15);
        const bestList = await scrapeRatingList(URL_RATING_BEST);
        if (isAborted) return;

        updateMessage("新曲枠の曲リストを取得中...", 20);
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

            const difficultyMapToJson = { 'MASTER': 'MAS', 'EXPERT': 'EXP', 'ULTIMA': 'ULT', 'ADVANCED': 'ADV', 'BASIC': 'BAS' };
            const diffAbbreviation = difficultyMapToJson[song.difficulty];
            const songKey = `${normalizeTitle(song.title)}|${diffAbbreviation}`;
            const matchedConst = constMap.get(songKey);
            const rating = calculateRating(song.score_int, matchedConst);

            detailedSongs.push({ ...song, ...details, 'const': matchedConst || 0.0, rating });
        }
        if (isAborted) return;
        const finalBestList = detailedSongs.slice(0, bestList.length);
        const finalRecentList = detailedSongs.slice(bestList.length);

        await generateImage(playerData, finalBestList, finalRecentList, mode);

    } catch (error) {
        if (isAborted) {
            return;
        }
        showError(error.message);
    }
})();