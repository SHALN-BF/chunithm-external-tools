(async function () {
    'use strict';

    if (window.__ratnatorRunning) {
        return;
    }
    window.__ratnatorRunning = true;

    const CURRENT_VERSION = 'X-VERSE-X';
    const BASE_URL = 'https://new.chunithm-net.com/chuni-mobile/html/mobile/';
    const CONST_DATA_URL = 'https://reiwa.f5.si/chunithm_record.json';
    const URL_PLAYER_DATA = BASE_URL + 'home/playerData/';
    const URL_RATING_DETAIL_BEST = BASE_URL + 'home/playerData/ratingDetailBest/';
    const URL_RATING_DETAIL_RECENT = BASE_URL + 'home/playerData/ratingDetailRecent/';
    const URL_RANKING_DETAIL_SEND = BASE_URL + 'ranking/sendRankingDetail/';
    const MAX_BEST_COUNT = 30;
    const MAX_NEW_COUNT = 20;
    const SONG_DETAIL_DELAY_SEC = 0.5;

    const normalizeTitle = (title = '') => title
        .replace(/\u3000/g, ' ')
        .replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ')
        .replace(/[’]/g, "'")
        .replace(/[“”]/g, '"')
        .trim()
        .toLowerCase();

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchDocument = async (url, options = {}) => {
        const response = await fetch(url, options);
        if (response.status === 503) {
            throw new Error('現在CHUNITHM-NETはメンテナンス中です！');
        }
        if (!response.ok) {
            throw new Error(`HTTPエラーが発生しました: ${response.status} (${url})`);
        }
        const htmlText = await response.text();
        if (htmlText.includes('再度ログインしてください')) {
            throw new Error('セッションが切れました。CHUNITHM-NETに再度ログインしてください。');
        }
        return new DOMParser().parseFromString(htmlText, 'text/html');
    };

    const parseScoreFromText = (text) => {
        if (!text) {
            return { scoreStr: '', scoreInt: 0 };
        }
        const normalized = String(text).replace(/\s+/g, '');
        const match = normalized.match(/\d[\d,]*/);
        if (!match) {
            return { scoreStr: '', scoreInt: 0 };
        }
        const scoreStr = match[0];
        const scoreInt = parseInt(scoreStr.replace(/,/g, ''), 10) || 0;
        return { scoreStr, scoreInt };
    };

    const getRankInfo = (score) => {
        if (score >= 1009000) return { rank: 'SSS+', color: '#FFD700' };
        if (score >= 1007500) return { rank: 'SSS', color: '#ffdf75' };
        if (score >= 1005000) return { rank: 'SS+', color: '#ffda8a' };
        if (score >= 1000000) return { rank: 'SS', color: '#fcc652' };
        if (score >= 975000) return { rank: 'S', color: '#ffaf47' };
        if (score >= 950000) return { rank: 'AAA', color: '#f44336' };
        if (score >= 925000) return { rank: 'AA', color: '#f44336' };
        if (score >= 900000) return { rank: 'A', color: '#f44336' };
        if (score >= 800000) return { rank: 'BBB', color: '#2196F3' };
        if (score >= 700000) return { rank: 'BB', color: '#2196F3' };
        if (score >= 600000) return { rank: 'B', color: '#2196F3' };
        if (score >= 500000) return { rank: 'C', color: '#795548' };
        return { rank: 'D', color: '#9E9E9E' };
    };

    const calculateRating = (score, constant) => {
        score = Number(score);
        constant = Number(constant);
        if (Number.isNaN(score) || Number.isNaN(constant)) return 0.0;

        let rating = 0;

        if (score >= 1009000) {
            rating = constant + 2.15;
        } else if (score >= 1007500) {
            rating = constant + 2.0 + (score - 1007500) * 0.0001;
        } else if (score >= 1005000) {
            rating = constant + 1.5 + (score - 1005000) * 0.0002;
        } else if (score >= 1000000) {
            rating = constant + 1.0 + (score - 1000000) * 0.0001;
        } else if (score >= 975000) {
            rating = constant + (score - 975000) * 0.00004;
        } else if (score >= 950000) {
            rating = constant - 1.67 + (score - 950000) / 15000;
        } else if (score >= 925000) {
            rating = constant - 3.34 + (score - 925000) / 15000;
        } else if (score >= 900000) {
            rating = constant - 5.0 + (score - 900000) / 15000;
        } else if (score >= 800000) {
            const base = (constant - 5.0) / 2;
            const pointsPer001 = 2000 / (constant - 5.0);
            const increment = (score - 800000) / pointsPer001 * 0.01;
            rating = base + increment;
        } else if (score >= 500000) {
            const pointsPer001 = 6000 / (constant - 5.0);
            const increment = (score - 500000) / pointsPer001 * 0.01;
            rating = increment;
        }

        if (rating < 0) rating = 0;
        const internal = Math.floor(rating * 10000 + 1e-6) / 10000;
        return Math.floor(internal * 100 + 1e-6) / 100;
    };

    const calculateAverageRating = (list) => {
        if (!list || list.length === 0) {
            return 0.0;
        }
        const total = list.reduce((sum, song) => sum + (song.rating ?? 0), 0);
        return total / list.length;
    };

    const extractTextByLabel = (root, labelPatterns) => {
        const patterns = Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns];
        const nodes = root.querySelectorAll('*');
        for (const node of nodes) {
            const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) continue;
            if (!patterns.some(pattern => pattern.test(text))) continue;

            const numbers = text.match(/\d[\d,]*(?:\.\d+)?/g);
            if (numbers && numbers.length) {
                return numbers[numbers.length - 1];
            }

            const neighbors = [node.nextElementSibling, node.parentElement?.nextElementSibling];
            for (const neighbor of neighbors) {
                if (!neighbor) continue;
                const neighborText = (neighbor.textContent || '').replace(/\s+/g, ' ').trim();
                const neighborNumbers = neighborText.match(/\d[\d,]*(?:\.\d+)?/g);
                if (neighborNumbers && neighborNumbers.length) {
                    return neighborNumbers[neighborNumbers.length - 1];
                }
            }
        }
        return '';
    };

    const extractMusicDetailStats = (root) => {
        const scoreElement = root.querySelector('.musicdata_score_num .text_b, .rank_playdata_highscore .text_b, .play_musicdata_highscore .text_b');
        const scoreText = scoreElement?.innerText?.trim() || extractTextByLabel(root, [
            /HIGH\s*SCORE/i,
            /SCORE/i,
            /スコア/i,
        ]);
        const parsedScore = parseScoreFromText(scoreText);

        const playCountBlock = Array.from(root.querySelectorAll('.block_underline')).find(block => /プレイ回数/i.test(block.textContent || ''));
        const playCountElement = playCountBlock?.querySelector('.musicdata_score_num .text_b');
        const playCountText = playCountElement?.innerText?.trim() || extractTextByLabel(root, [
            /プレイ回数/i,
            /プレイ数/i,
            /PLAY\s*COUNT/i,
            /PLAYCOUNT/i,
        ]);

        return {
            scoreStr: parsedScore.scoreStr,
            scoreInt: parsedScore.scoreInt,
            playCount: playCountText,
        };
    };

    const extractSeedDetailStats = (root) => {
        const detailStats = extractMusicDetailStats(root);
        return {
            score_str: detailStats.scoreStr,
            score_int: detailStats.scoreInt,
            playCount: detailStats.playCount,
        };
    };

    const extractPlayCount = (root) => extractTextByLabel(root, [
        /プレイ回数/i,
        /プレイ数/i,
        /PLAY\s*COUNT/i,
        /PLAYCOUNT/i,
    ]);

    const extractOverPower = (root) => extractTextByLabel(root, [
        /OVER\s*POWER/i,
        /OVERPOWER/i,
    ]);

    const extractPlayerCount = (doc, selector) => {
        const text = doc.querySelector(selector)?.innerText?.trim() || '';
        return text.replace(/[\s,]/g, '');
    };

    const parseRatingString = (doc) => {
        let ratingString = '';
        const ratingImages = doc.querySelectorAll('.player_rating_num_block img');
        ratingImages.forEach(img => {
            const src = img.src || '';
            const lastChar = src.charAt(src.length - 5);
            ratingString += (lastChar === 'a') ? '.' : lastChar;
        });
        return ratingString;
    };

    const parsePlayerInfo = (doc) => {
        const name = doc.querySelector('.player_name_in')?.innerText?.trim() || 'UNKNOWN';
        const rating = parseRatingString(doc);
        const overPower = doc.querySelector('.player_overpower_text')?.innerText?.trim() || extractOverPower(doc);
        const playCount = extractPlayerCount(doc, '.user_data_play_count .user_data_text');
        const currentPlayCount = extractPlayerCount(doc, '.user_data_current_play_count .user_data_text');
        let code = '';

        try {
            const friendRoot = doc.querySelector('.user_data_friend_code') || doc;
            const tap = friendRoot.querySelector('.user_data_friend_tap') || friendRoot.querySelector('.user_data_text.user_data_friend_tap') || friendRoot.querySelector('.user_data_text');
            if (tap) {
                const spans = tap.querySelectorAll('span');
                for (const span of spans) {
                    const text = (span.textContent || span.innerText || '').trim();
                    if (/^\d{6,}$/.test(text)) {
                        code = text;
                        break;
                    }
                    const style = span.getAttribute && span.getAttribute('style');
                    if (style && /display\s*:\s*none/.test(style) && /^\d+$/.test(text)) {
                        code = text;
                        break;
                    }
                }
                if (!code) {
                    const allText = (tap.textContent || tap.innerText || '').trim();
                    const match = allText.match(/(\d{6,})/);
                    if (match) {
                        code = match[1];
                    }
                }
            }
        } catch (error) {
            console.warn('Friend code parse error', error);
        }

        return {
            name,
            rating,
            code,
            overPower,
            playCount,
            currentPlayCount,
        };
    };

    const enrichSongsWithConstData = (constData, songList) => {
        const diffMap = { BAS: '0', ADV: '1', EXP: '2', MAS: '3', ULT: '4' };
        const diffNameMap = { BAS: 'BASIC', ADV: 'ADVANCED', EXP: 'EXPERT', MAS: 'MASTER', ULT: 'ULTIMA' };
        const songDataMap = new Map();

        for (const songData of constData) {
            if (!songData || !diffMap[songData.diff]) continue;
            const key = `${normalizeTitle(songData.title)}|${songData.diff}`;
            if (!songDataMap.has(key)) {
                songDataMap.set(key, songData);
            }
        }

        return songList.map(song => {
            const diffCode = String(song.params?.diff ?? '');
            const diffKey = diffMap[diffCode];
            if (!diffKey) return null;

            const songData = songDataMap.get(`${normalizeTitle(song.title)}|${diffKey}`);
            if (!songData) return null;

            return {
                title: songData.title,
                artist: songData.artist,
                difficulty: diffNameMap[songData.diff],
                const: Number(songData.const),
                score_int: Number(song.score_int) || 0,
                score_str: song.score_str || '',
                playCount: song.playCount || 'N/A',
                detailSendUrl: song.detailSendUrl || '',
                params: song.params,
                jacketUrl: songData.img ? `https://new.chunithm-net.com/chuni-mobile/html/mobile/img/${songData.img}.jpg` : '',
            };
        }).filter(Boolean);
    };

    const fetchRatingDetailSongSeeds = async (pageUrl) => {
        const doc = await fetchDocument(pageUrl);
        const songForms = doc.querySelectorAll('form[action$="sendMusicDetail/"]');
        const initialSongList = [];

        songForms.forEach(form => {
            const title = form.querySelector('.music_title')?.innerText?.trim();
            const seedStats = extractSeedDetailStats(form);
            const params = {};
            form.querySelectorAll('input[name]').forEach(input => {
                params[input.name] = input.value || '';
            });
            if (!title || !params.idx || !params.token || !params.genre || !params.diff) return;

            initialSongList.push({
                title,
                detailSendUrl: form.getAttribute('action') ? new URL(form.getAttribute('action'), window.location.origin).href : '',
                params,
                score_str: seedStats.score_str,
                score_int: seedStats.score_int,
                playCount: seedStats.playCount || 'N/A',
            });
        });

        return initialSongList;
    };

    const processSongList = async (list, delay) => {
        const detailedSongs = [];

        for (let i = 0; i < list.length; i++) {
            const song = list[i];
            if (i > 0 && delay > 0) {
                await sleep(delay * 1000);
            }

            try {
                const detailSendUrl = song.detailSendUrl || URL_RANKING_DETAIL_SEND;
                const detailDoc = await fetchDocument(detailSendUrl, {
                    method: 'POST',
                    body: new URLSearchParams(song.params),
                    redirect: 'follow',
                });

                const detailStats = extractMusicDetailStats(detailDoc);
                const seedScoreInt = Number(song.score_int) || 0;
                const scoreInt = Number(detailStats.scoreInt) > 0 ? Number(detailStats.scoreInt) : seedScoreInt;
                const scoreStr = detailStats.scoreStr || song.score_str || '';
                if (!Number.isFinite(scoreInt) || scoreInt <= 0) continue;

                detailedSongs.push({
                    ...song,
                    score_str: scoreStr,
                    score_int: scoreInt,
                    playCount: detailStats.playCount || song.playCount || 'N/A',
                });
            } catch (error) {
                console.warn(`スコア取得失敗: ${song.title}`, error);
                if (Number(song.score_int) > 0) {
                    detailedSongs.push({
                        ...song,
                        score_str: song.score_str || String(song.score_int),
                        score_int: Number(song.score_int),
                        playCount: song.playCount || 'N/A',
                    });
                }
            }
        }

        return detailedSongs;
    };

    const fetchAllSongsForPaidUserViaRecord = async (delay, constData, options = {}) => {
        const bestSeeds = await fetchRatingDetailSongSeeds(URL_RATING_DETAIL_BEST);
        const recentSeeds = await fetchRatingDetailSongSeeds(URL_RATING_DETAIL_RECENT);

        const detailedOldSongs = await processSongList(enrichSongsWithConstData(constData, bestSeeds), delay);
        const detailedNewSongs = await processSongList(enrichSongsWithConstData(constData, recentSeeds), delay);

        detailedNewSongs.forEach(song => {
            song.rating = calculateRating(song.score_int, song.const);
        });
        detailedOldSongs.forEach(song => {
            song.rating = calculateRating(song.score_int, song.const);
        });

        detailedNewSongs.sort((a, b) => b.rating - a.rating);
        detailedOldSongs.sort((a, b) => b.rating - a.rating);

        return { detailedNewSongs, detailedOldSongs };
    };

    const buildFrameLists = (detailedOldSongs, detailedNewSongs) => ({
        best: detailedOldSongs.slice(0, MAX_BEST_COUNT),
        recent: detailedNewSongs.slice(0, MAX_NEW_COUNT),
    });

    const createOverlay = () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position: fixed',
            'inset: 0',
            'z-index: 999999',
            'background: rgba(6, 10, 18, 0.88)',
            'backdrop-filter: blur(10px)',
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'padding: 20px',
            'box-sizing: border-box',
            'color: #f6f9ff',
            'font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        ].join('; ');

        const panel = document.createElement('div');
        panel.style.cssText = [
            'width: min(1180px, 100%)',
            'max-height: 94vh',
            'overflow: hidden',
            'display: grid',
            'grid-template-rows: auto auto 1fr',
            'gap: 16px',
            'padding: 24px',
            'border-radius: 24px',
            'border: 1px solid rgba(255,255,255,0.10)',
            'background: linear-gradient(180deg, rgba(18,25,38,0.98), rgba(10,15,24,0.96))',
            'box-shadow: 0 28px 80px rgba(0,0,0,0.45)',
        ].join('; ');

        const header = document.createElement('div');
        header.innerHTML = `
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                <div>
                    <div style="font-size:13px; letter-spacing:0.18em; text-transform:uppercase; color:#8cb4ff; margin-bottom:8px;">Ratnator.js</div>
                    <h1 style="margin:0; font-size:28px; line-height:1.1;">CHUNITHM レート・対象曲テキスト出力</h1>
                    <p style="margin:10px 0 0; color:#a7b4c7; line-height:1.7;">現在レーティング、Best/New の平均、OverPower、そして各枠のレーティング対象曲を文字情報でまとめます。</p>
                </div>
                <div id="ratnator-status" style="min-width:240px; text-align:right; color:#d8e5f7; font-weight:600; line-height:1.6;"></div>
            </div>
        `;

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex; gap:12px; flex-wrap:wrap; align-items:center;';

        const copyButton = document.createElement('button');
        copyButton.textContent = '結果をコピー';
        copyButton.style.cssText = [
            'appearance:none',
            'border:0',
            'cursor:pointer',
            'border-radius:999px',
            'padding:12px 18px',
            'font-weight:700',
            'color:#08111d',
            'background: linear-gradient(135deg, #8df0c9, #7bb8ff)',
            'box-shadow: 0 14px 32px rgba(123,184,255,0.22)',
        ].join('; ');

        const closeButton = document.createElement('button');
        closeButton.textContent = '閉じる';
        closeButton.style.cssText = [
            'appearance:none',
            'border:1px solid rgba(255,255,255,0.12)',
            'background: rgba(255,255,255,0.04)',
            'cursor:pointer',
            'border-radius:999px',
            'padding:12px 18px',
            'font-weight:700',
            'color:#f6f9ff',
        ].join('; ');

        const body = document.createElement('div');
        body.style.cssText = [
            'overflow:auto',
            'border-radius:20px',
            'border:1px solid rgba(255,255,255,0.08)',
            'background: rgba(255,255,255,0.03)',
            'padding:18px',
            'white-space:pre-wrap',
            'word-break:break-word',
            'font-family: "Source Code Pro", ui-monospace, SFMono-Regular, Menlo, monospace',
            'font-size:14px',
            'line-height:1.75',
            'color:#e7f1ff',
        ].join('; ');

        actions.appendChild(copyButton);
        actions.appendChild(closeButton);
        panel.appendChild(header);
        panel.appendChild(actions);
        panel.appendChild(body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        return {
            overlay,
            statusEl: header.querySelector('#ratnator-status'),
            body,
            copyButton,
            closeButton,
        };
    };

    const formatSongLine = (song, index) => {
        const rankInfo = getRankInfo(song.score_int);
        const scoreText = song.score_str || song.score_int.toLocaleString('en-US');
        const playCountText = song.playCount && song.playCount !== 'N/A' ? song.playCount : 'N/A';
        const ratingText = Number.isFinite(song.rating) ? song.rating.toFixed(2) : '0.00';
        const constText = Number.isFinite(song.const) ? song.const.toFixed(2) : 'N/A';

        return [
            `${index + 1}. ${song.title} [${song.difficulty}]`,
            `   プレイ回数: ${playCountText}`,
            `   譜面定数: ${constText}`,
            `   単曲レート: ${ratingText}`,
            `   スコア/ランク: ${scoreText} [${rankInfo.rank}]`,
        ].join('\n');
    };

    const renderTextReport = (player, bestList, newList) => {
        const bestAvg = calculateAverageRating(bestList);
        const newAvg = calculateAverageRating(newList);
        const lines = [];
        const currentRatingText = Number(player.rating).toFixed(2);
        const overPowerText = player.overPower ? player.overPower : '取得できませんでした';
        const playCountText = player.playCount || '取得できませんでした';
        const currentPlayCountText = player.currentPlayCount || '取得できませんでした';

        lines.push('CHUNITHM Ratnator');
        lines.push(`ユーザー名: ${player.name}`);
        lines.push(`フレンドコード: ${player.code || '-'}`);
        lines.push(`現在レーティング: ${currentRatingText}`);
        lines.push(`総プレイ回数: ${playCountText}`);
        lines.push(`現在プレイ回数: ${currentPlayCountText}`);
        lines.push(`Best Ave: ${bestAvg.toFixed(4)}`);
        lines.push(`New Ave: ${newAvg.toFixed(4)}`);
        lines.push(`OverPower: ${overPowerText}`);
        lines.push(`出力時刻: ${new Date().toLocaleString('ja-JP')}`);
        lines.push('');
        lines.push(`【BEST枠 ${bestList.length}件】`);

        if (bestList.length === 0) {
            lines.push('  該当曲なし');
        } else {
            bestList.forEach((song, index) => {
                lines.push(formatSongLine(song, index));
                if (index !== bestList.length - 1) {
                    lines.push('');
                }
            });
        }

        lines.push('');
        lines.push(`【NEW枠 ${newList.length}件】`);

        if (newList.length === 0) {
            lines.push('  該当曲なし');
        } else {
            newList.forEach((song, index) => {
                lines.push(formatSongLine(song, index));
                if (index !== newList.length - 1) {
                    lines.push('');
                }
            });
        }

        return lines.join('\n');
    };

    const showError = (overlayRefs, message) => {
        overlayRefs.statusEl.innerHTML = `<span style="color:#ffb3b3;">エラー</span>`;
        overlayRefs.body.textContent = message;
    };

    const run = async () => {
        if (window.location.hostname !== 'new.chunithm-net.com') {
            throw new Error('このスクリプトはCHUNITHM-NET内でのみ実行できます。');
        }

        const overlayRefs = createOverlay();
        overlayRefs.statusEl.textContent = 'プレイヤー情報を取得中...';
        overlayRefs.body.textContent = '読み込み中...';

        const close = () => {
            window.__ratnatorRunning = false;
            overlayRefs.overlay.remove();
        };

        overlayRefs.closeButton.addEventListener('click', close);

        let reportText = '';
        try {
            const playerDoc = await fetchDocument(URL_PLAYER_DATA);
            const player = parsePlayerInfo(playerDoc);
            overlayRefs.statusEl.innerHTML = `ユーザー: <span style="color:#8df0c9;">${player.name}</span><br>レーティングを解析しました`;

            const constData = await fetch(CONST_DATA_URL).then(response => response.json());
            overlayRefs.statusEl.innerHTML += '<br>定数データを取得しました';

            const paidResult = await fetchAllSongsForPaidUserViaRecord(SONG_DETAIL_DELAY_SEC, constData);
            const detailedOldSongs = paidResult.detailedOldSongs;
            const detailedNewSongs = paidResult.detailedNewSongs;

            const frameLists = buildFrameLists(detailedOldSongs, detailedNewSongs);
            const bestList = frameLists.best;
            const newList = frameLists.recent;
            reportText = renderTextReport(player, bestList, newList);
            overlayRefs.body.textContent = reportText;
            overlayRefs.statusEl.innerHTML = `
                ユーザー: <span style="color:#8df0c9;">${player.name}</span><br>
                現在レーティング: <span style="color:#7bb8ff;">${Number(player.rating).toFixed(2)}</span><br>
                Best Ave / New Ave も含むテキスト出力を生成しました
            `;

            overlayRefs.copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(reportText);
                    overlayRefs.copyButton.textContent = 'コピー完了';
                    setTimeout(() => {
                        overlayRefs.copyButton.textContent = '結果をコピー';
                    }, 1500);
                } catch (error) {
                    overlayRefs.copyButton.textContent = 'コピー失敗';
                    setTimeout(() => {
                        overlayRefs.copyButton.textContent = '結果をコピー';
                    }, 1500);
                }
            });
        } catch (error) {
            console.error(error);
            showError(overlayRefs, error.message || String(error));
            overlayRefs.copyButton.disabled = true;
        }
    };

    try {
        await run();
    } catch (error) {
        console.error(error);
        window.__ratnatorRunning = false;
        alert(error.message || String(error));
    }
})();
