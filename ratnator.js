(async function () {
    'use strict';

    if (window.__ratnatorRunning) {
        return;
    }
    window.__ratnatorRunning = true;

    const CONSTANTS = {
        VERSION: 'X-VERSE-X',
        URLS: {
            BASE: 'https://new.chunithm-net.com/chuni-mobile/html/mobile/',
            CONST_DATA: 'https://reiwa.f5.si/chunithm_record.json',
            PLAYER_DATA: 'home/playerData/',
            RANKING: { DETAIL_SEND: 'ranking/sendRankingDetail/' }
        }
    };
    const CURRENT_VERSION = CONSTANTS.VERSION;
    const BASE_URL = CONSTANTS.URLS.BASE;
    const CONST_DATA_URL = CONSTANTS.URLS.CONST_DATA;
    const URL_PLAYER_DATA = BASE_URL + CONSTANTS.URLS.PLAYER_DATA;
    const URL_RATING_DETAIL_BEST = BASE_URL + 'home/playerData/ratingDetailBest/';
    const URL_RATING_DETAIL_RECENT = BASE_URL + 'home/playerData/ratingDetailRecent/';
    const URL_RANKING_DETAIL_SEND = BASE_URL + CONSTANTS.URLS.RANKING.DETAIL_SEND;
    const MAX_BEST_COUNT = 30;
    const MAX_NEW_COUNT = 20;
    const SONG_DETAIL_DELAY_SEC = 0.5;

    // runtime options (can be changed via UI later)
    let MATCH_MODE = 'exact'; // 'exact' or 'title'
    let BEST_CONST_THRESHOLD = 14.5;
    let NEW_CONST_THRESHOLD = 13.5;
    let APPLY_CONST_THRESHOLD = true;

    const normalizeTitle = (title = '') => String(title)
        .normalize('NFKC')
        .replace(/\u3000/g, ' ')
        .replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ')
        .replace(/[’]/g, "'")
        .replace(/[“”]/g, '"')
        .trim()
        .toLowerCase();

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const createDiagnostics = () => {
        const entries = [];
        return {
            entries,
            log(step, data = {}) {
                const entry = { step, ...data };
                entries.push(entry);
                console.log('[Ratnator]', step, data);
            },
        };
    };

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
        // require at least 6 digits (score-like) to avoid picking up small numbers
        const match = normalized.match(/\d[\d,]{5,}/);
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

    const getTextFromSelectors = (root, selectors) => {
        const list = Array.isArray(selectors) ? selectors : [selectors];
        for (const sel of list) {
            try {
                const el = root.querySelector(sel);
                if (el) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t) return t;
                }
            } catch (e) {
                // invalid selector - ignore
            }
        }
        return '';
    };

    const extractTextByLabel = (root, labelPatterns) => {
        const patterns = Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns];
        const nodes = root.querySelectorAll('*');
        for (const node of nodes) {
            const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) continue;
            if (!patterns.some(pattern => pattern.test(text))) continue;

            const numbers = text.match(/\d[\d,]{5,}(?:\.\d+)?/g) || text.match(/\d[\d,]*(?:\.\d+)?/g);
            if (numbers && numbers.length) {
                return numbers[numbers.length - 1];
            }

            const neighbors = [node.nextElementSibling, node.parentElement?.nextElementSibling];
            for (const neighbor of neighbors) {
                if (!neighbor) continue;
                const neighborText = (neighbor.textContent || neighbor.innerText || '').replace(/\s+/g, ' ').trim();
                const neighborNumbers = neighborText.match(/\d[\d,]{5,}(?:\.\d+)?/g) || neighborText.match(/\d[\d,]*(?:\.\d+)?/g);
                if (neighborNumbers && neighborNumbers.length) {
                    return neighborNumbers[neighborNumbers.length - 1];
                }
            }
        }
        return '';
    };

    const extractMusicDetailStats = (root) => {
        // try selector-first extraction (explicit score elements)
        const scoreSelectors = [
            '.musiclist_box .play_musicdata_highscore .text_b',
            '.box05 .play_musicdata_highscore .text_b',
            '.play_musicdata_highscore .text_b',
            '.musicdata_score_num .text_b',
            '.rank_playdata_highscore .text_b'
        ];
        const scoreElementText = getTextFromSelectors(root, scoreSelectors);
        const scoreElementHtml = (root.querySelector(scoreSelectors[0])?.outerHTML) || '';

        // fallback to label-based extraction if selector didn't yield a score-like string
        const scoreTextCandidate = scoreElementText || extractTextByLabel(root, [/HIGH\s*SCORE/i, /SCORE/i, /スコア/i]);
        const parsedScore = parseScoreFromText(scoreTextCandidate);

        // play count selector-first
        const playCountSelectors = [
            '.musiclist_box .playcount .text_b',
            '.musiclist_box .musicdata_playcount .text_b',
            '.block_underline .musicdata_score_num .text_b',
            '.musicdata_playcount .text_b',
            '.play_count .text_b'
        ];
        const playCountTextCandidate = getTextFromSelectors(root, playCountSelectors) || extractTextByLabel(root, [/プレイ回数/i, /プレイ数/i, /PLAY\s*COUNT/i, /PLAYCOUNT/i]);

        return {
            scoreStr: parsedScore.scoreStr,
            scoreInt: parsedScore.scoreInt,
            rawScoreText: scoreTextCandidate || '',
            rawScoreHtml: scoreElementHtml || '',
            playCount: playCountTextCandidate || '',
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

    const enrichSongsWithConstData = (constData, songList, debug = null, label = '') => {
        const diffMap = { BAS: '0', ADV: '1', EXP: '2', MAS: '3', ULT: '4' };
        const reverseDiffMap = { '0': 'BAS', '1': 'ADV', '2': 'EXP', '3': 'MAS', '4': 'ULT' };
        const diffNameMap = { BAS: 'BASIC', ADV: 'ADVANCED', EXP: 'EXPERT', MAS: 'MASTER', ULT: 'ULTIMA' };

        const matchMode = MATCH_MODE || 'exact';
        const applyConstThreshold = APPLY_CONST_THRESHOLD;
        const bestConstThreshold = BEST_CONST_THRESHOLD;
        const newConstThreshold = NEW_CONST_THRESHOLD;

        // build seed map from provided songList
        const songSeedMap = new Map();
        if (matchMode === 'exact') {
            songList.forEach(song => {
                const diffAbbreviation = reverseDiffMap[String(song.params?.diff)];
                if (!diffAbbreviation) return;
                const key = `${normalizeTitle(song.title)}|${diffAbbreviation}`;
                if (!songSeedMap.has(key)) songSeedMap.set(key, song);
            });
        } else {
            songList.forEach(song => {
                const nTitle = normalizeTitle(song.title);
                if (!songSeedMap.has(nTitle)) songSeedMap.set(nTitle, song);
            });
        }

        const enriched = [];

        for (const songData of constData) {
            if (!songData || !diffMap[songData.diff]) continue;

            const isNewSong = songData.version === CURRENT_VERSION;

            if (applyConstThreshold) {
                const threshold = isNewSong ? newConstThreshold : bestConstThreshold;
                if (Number(songData.const) < threshold) continue;
            }

            let initialSong = null;
            if (matchMode === 'exact') {
                const key = `${normalizeTitle(songData.title)}|${songData.diff}`;
                initialSong = songSeedMap.get(key);
            } else {
                initialSong = songSeedMap.get(normalizeTitle(songData.title));
            }

            if (!initialSong) continue;

            const scoreInt = (matchMode === 'exact' && Number.isFinite(initialSong.score_int)) ? initialSong.score_int : 0;
            if (matchMode === 'exact' && scoreInt <= 0) continue; // paid mode: skip if no score

            const params = matchMode === 'exact'
                ? initialSong.params
                : { ...initialSong.params, diff: diffMap[songData.diff] };

            const songObject = {
                title: songData.title,
                artist: songData.artist,
                difficulty: diffNameMap[songData.diff],
                const: Number(songData.const),
                score_int: scoreInt,
                score_str: (matchMode === 'exact' && initialSong.score_str) ? initialSong.score_str : '',
                playCount: 'N/A',
                params: params,
                detailSendUrl: initialSong.detailSendUrl || '',
                jacketUrl: songData.img ? `https://new.chunithm-net.com/chuni-mobile/html/mobile/img/${songData.img}.jpg` : '',
            };

            if (matchMode === 'exact' && scoreInt > 0) {
                songObject.rating = calculateRating(scoreInt, songObject.const);
            }

            enriched.push(songObject);
        }

        // dedupe by title + difficulty
        const unique = enriched.filter((s, i, arr) => i === arr.findIndex(x => x.title === s.title && x.difficulty === s.difficulty));

        if (debug) {
            debug.log('enrich', { label, inputCount: songList.length, outputCount: unique.length, sampleOutput: unique.slice(0, 3).map(s => ({ title: s.title, difficulty: s.difficulty, const: s.const })) });
        }

        try { if (window.__ratnatorUpdateProgress) window.__ratnatorUpdateProgress(20, `Enriched ${label}: ${unique.length}曲`); } catch (e) { }

        return unique;
    };

    const fetchRatingDetailSongSeeds = async (pageUrl, debug = null, label = '') => {
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

        if (debug) {
            debug.log('seed', {
                label,
                count: initialSongList.length,
                sample: initialSongList.slice(0, 3).map(song => ({ title: song.title, diff: song.params?.diff, score_int: song.score_int })),
            });
        }

        try {
            if (window.__ratnatorUpdateProgress) window.__ratnatorUpdateProgress(5, `Seeds ${label}: ${initialSongList.length}曲`);
        } catch (e) { }

        return initialSongList;
    };

    const processSongList = async (list, delay, debug = null, label = '') => {
        const detailedSongs = [];
        let successCount = 0;
        let failCount = 0;

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
                const detailScoreInt = Number(detailStats.scoreInt) || 0;
                const scoreInt = detailScoreInt > 0 ? detailScoreInt : seedScoreInt;
                const scoreStr = detailStats.scoreStr || song.score_str || '';
                if (!Number.isFinite(scoreInt) || scoreInt <= 0) {
                    if (debug) debug.log('songDetail', { title: song.title, seedScoreInt, detailScoreInt, usedScoreInt: scoreInt, note: 'invalid score, skipped' });
                    continue;
                }

                successCount++;
                detailedSongs.push({
                    ...song,
                    seed_score_int: seedScoreInt,
                    detail_score_int: detailScoreInt,
                    score_str: scoreStr,
                    score_int: scoreInt,
                    playCount: detailStats.playCount || song.playCount || 'N/A',
                });
                if (debug) debug.log('songDetail', { title: song.title, seedScoreInt, detailScoreInt: Number(detailStats.scoreInt) || 0, usedScoreInt: scoreInt, rawScoreText: detailStats.rawScoreText, rawScoreHtml: detailStats.rawScoreHtml });
                try {
                    if (window.__ratnatorUpdateProgress) {
                        const p = Math.round(((i + 1) / Math.max(1, list.length)) * 100);
                        window.__ratnatorUpdateProgress(p, `${label}: ${i + 1}/${list.length}`);
                    }
                } catch (e) { }
            } catch (error) {
                failCount++;
                console.warn(`スコア取得失敗: ${song.title}`, error);
                if (Number(song.score_int) > 0) {
                    detailedSongs.push({
                        ...song,
                        seed_score_int: Number(song.score_int) || 0,
                        detail_score_int: null,
                        score_str: song.score_str || String(song.score_int),
                        score_int: Number(song.score_int),
                        playCount: song.playCount || 'N/A',
                    });
                    if (debug) debug.log('songDetail', { title: song.title, seedScoreInt: Number(song.score_int) || 0, detailScoreInt: null, usedScoreInt: Number(song.score_int) || 0, note: 'detail fetch failed, used seed' });
                    try {
                        if (window.__ratnatorUpdateProgress) {
                            const p = Math.round(((i + 1) / Math.max(1, list.length)) * 100);
                            window.__ratnatorUpdateProgress(p, `${label}: ${i + 1}/${list.length}`);
                        }
                    } catch (e) { }
                }
            }
        }

        if (debug) {
            debug.log('detail', {
                label,
                inputCount: list.length,
                outputCount: detailedSongs.length,
                successCount,
                failCount,
                sampleOutput: detailedSongs.slice(0, 3).map(song => ({ title: song.title, score_int: song.score_int, const: song.const })),
            });
        }
        try { if (window.__ratnatorUpdateProgress) window.__ratnatorUpdateProgress(60, `${label} 完了`); } catch (e) { }

        return detailedSongs;
    };

    const fetchAllSongsForPaidUserViaRecord = async (delay, constData, options = {}) => {
        const { debug = null } = options;
        const bestSeeds = await fetchRatingDetailSongSeeds(URL_RATING_DETAIL_BEST, debug, 'BEST seed page');
        const recentSeeds = await fetchRatingDetailSongSeeds(URL_RATING_DETAIL_RECENT, debug, 'NEW seed page');

        const enrichedOldSongs = enrichSongsWithConstData(constData, bestSeeds, debug, 'BEST');
        const enrichedNewSongs = enrichSongsWithConstData(constData, recentSeeds, debug, 'NEW');

        const detailedOldSongs = await processSongList(enrichedOldSongs, delay, debug, 'BEST detail');
        const detailedNewSongs = await processSongList(enrichedNewSongs, delay, debug, 'NEW detail');

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

        const progressWrap = document.createElement('div');
        progressWrap.style.cssText = 'width:100%; margin-top:12px;';
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'width:100%; height:10px; background:rgba(255,255,255,0.06); border-radius:999px; overflow:hidden;';
        const progressBar = document.createElement('div');
        progressBar.style.cssText = 'width:0%; height:100%; background:linear-gradient(90deg,#7bb8ff,#8df0c9); transition:width 200ms linear;';
        const progressText = document.createElement('div');
        progressText.style.cssText = 'font-size:12px; color:#cfe8ff; margin-top:6px; text-align:right;';
        progressContainer.appendChild(progressBar);
        progressWrap.appendChild(progressContainer);
        progressWrap.appendChild(progressText);
        header.appendChild(progressWrap);

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
        const excelButton = document.createElement('button');
        excelButton.textContent = 'Excel用コピー';
        excelButton.style.cssText = [
            'appearance:none',
            'border:0',
            'cursor:pointer',
            'border-radius:999px',
            'padding:12px 18px',
            'font-weight:700',
            'color:#08111d',
            'background: linear-gradient(135deg, #ffd27a, #ffc07a)',
            'box-shadow: 0 10px 24px rgba(255,192,122,0.12)',
        ].join('; ');
        actions.appendChild(excelButton);
        actions.appendChild(closeButton);
        panel.appendChild(header);
        panel.appendChild(actions);
        panel.appendChild(body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // expose a progress updater
        window.__ratnatorUpdateProgress = (percent, text) => {
            try {
                const p = Math.max(0, Math.min(100, Number(percent) || 0));
                progressBar.style.width = p + '%';
                progressText.textContent = text || '';
            } catch (e) { /* silent */ }
        };

        return {
            overlay,
            statusEl: header.querySelector('#ratnator-status'),
            body,
            copyButton,
            excelButton,
            closeButton,
            progress: window.__ratnatorUpdateProgress,
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

    const renderTextReport = (player, bestList, newList, diagnostics = []) => {
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

        if (diagnostics.length > 0) {
            lines.push('');
            lines.push('【DEBUG】');
            diagnostics.forEach(entry => {
                const payload = { ...entry };
                delete payload.step;
                lines.push(`${entry.step}: ${JSON.stringify(payload)}`);
            });
        }

        return lines.join('\n');
    };

    const renderHtmlReport = (player, bestList, newList, diagnostics = []) => {
        const bestRows = bestList.map((song, idx) => {
            const rankInfo = getRankInfo(song.score_int);
            const playCountText = song.playCount && song.playCount !== 'N/A' ? song.playCount : 'N/A';
            const ratingText = Number.isFinite(song.rating) ? song.rating.toFixed(2) : '0.00';
            const constText = Number.isFinite(song.const) ? song.const.toFixed(2) : 'N/A';
            const seedScore = Number.isFinite(song.seed_score_int) ? song.seed_score_int : null;
            const detailScore = Number.isFinite(song.detail_score_int) ? song.detail_score_int : (Number.isFinite(song.score_int) ? song.score_int : null);
            const usedScoreText = song.score_str || (song.score_int ? String(song.score_int) : '');
            const delta = (seedScore !== null && detailScore !== null) ? (detailScore - seedScore) : 0;
            const mismatch = delta !== 0;
            const rowStyle = mismatch ? 'background: rgba(255,100,100,0.04);' : '';
            const scoreHtml = `${escapeHtml(usedScoreText)}<br/><small style="color:#9fb7d9;">${escapeHtml(rankInfo.rank)}</small>${mismatch ? `<div style="font-size:11px;color:#ffd7d7;">seed:${seedScore ?? '-'} → detail:${detailScore ?? '-'} (Δ${delta})</div>` : ''}`;

            return `
                <tr style="${rowStyle}">
                    <td style="padding:6px 8px; text-align:right;">${idx + 1}</td>
                    <td style="padding:6px 8px;">${escapeHtml(song.title)}</td>
                    <td style="padding:6px 8px; text-align:center;">${escapeHtml(song.difficulty || '')}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(playCountText)}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(constText)}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(ratingText)}</td>
                    <td style="padding:6px 8px; text-align:right;">${scoreHtml}</td>
                </tr>`;
        }).join('');

        const newRows = newList.map((song, idx) => {
            const rankInfo = getRankInfo(song.score_int);
            const playCountText = song.playCount && song.playCount !== 'N/A' ? song.playCount : 'N/A';
            const ratingText = Number.isFinite(song.rating) ? song.rating.toFixed(2) : '0.00';
            const constText = Number.isFinite(song.const) ? song.const.toFixed(2) : 'N/A';
            const seedScore = Number.isFinite(song.seed_score_int) ? song.seed_score_int : null;
            const detailScore = Number.isFinite(song.detail_score_int) ? song.detail_score_int : (Number.isFinite(song.score_int) ? song.score_int : null);
            const usedScoreText = song.score_str || (song.score_int ? String(song.score_int) : '');
            const delta = (seedScore !== null && detailScore !== null) ? (detailScore - seedScore) : 0;
            const mismatch = delta !== 0;
            const rowStyle = mismatch ? 'background: rgba(255,100,100,0.04);' : '';
            const scoreHtml = `${escapeHtml(usedScoreText)}<br/><small style="color:#9fb7d9;">${escapeHtml(rankInfo.rank)}</small>${mismatch ? `<div style="font-size:11px;color:#ffd7d7;">seed:${seedScore ?? '-'} → detail:${detailScore ?? '-'} (Δ${delta})</div>` : ''}`;

            return `
                <tr style="${rowStyle}">
                    <td style="padding:6px 8px; text-align:right;">${idx + 1}</td>
                    <td style="padding:6px 8px;">${escapeHtml(song.title)}</td>
                    <td style="padding:6px 8px; text-align:center;">${escapeHtml(song.difficulty || '')}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(playCountText)}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(constText)}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(ratingText)}</td>
                    <td style="padding:6px 8px; text-align:right;">${scoreHtml}</td>
                </tr>`;
        }).join('');

        const headerHtml = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                <div>
                    <div style="font-weight:700; color:#8cb4ff; margin-bottom:6px;">ユーザー</div>
                    <div style="font-size:16px; font-weight:700; color:#e7f1ff;">${escapeHtml(player.name)}</div>
                    <div style="font-size:13px; color:#9fb7d9;">現在レーティング: <span style="color:#7bb8ff;">${Number(player.rating).toFixed(2)}</span></div>
                </div>
                <div style="text-align:right; color:#cfe8ff;">
                    <div>Best Ave: <strong>${calculateAverageRating(bestList).toFixed(4)}</strong></div>
                    <div>New Ave: <strong>${calculateAverageRating(newList).toFixed(4)}</strong></div>
                    <div>OverPower: <strong>${escapeHtml(player.overPower || '取得できませんでした')}</strong></div>
                </div>
            </div>
        `;

        const tableStyle = 'width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;';
        const thStyle = 'text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,0.06); color:#cfe8ff;';

        const html = `
            ${headerHtml}
            <div style="margin-top:14px;">
                <div style="font-weight:700; color:#8df0c9; margin-bottom:6px;">BEST 枠 (${bestList.length}件)</div>
                <table style="${tableStyle}">
                    <thead>
                        <tr>
                            <th style="${thStyle}; width:48px;">No.</th>
                            <th style="${thStyle};">タイトル</th>
                            <th style="${thStyle}; width:90px;">譜面</th>
                            <th style="${thStyle}; width:90px;">プレイ回数</th>
                            <th style="${thStyle}; width:90px;">定数</th>
                            <th style="${thStyle}; width:90px;">単曲レート</th>
                            <th style="${thStyle}; width:120px; text-align:right;">スコア / ランク</th>
                        </tr>
                    </thead>
                    <tbody style="color:#e7f1ff;">${bestRows}</tbody>
                </table>
            </div>
            <div style="margin-top:16px;">
                <div style="font-weight:700; color:#7bb8ff; margin-bottom:6px;">NEW 枠 (${newList.length}件)</div>
                <table style="${tableStyle}">
                    <thead>
                        <tr>
                            <th style="${thStyle}; width:48px;">No.</th>
                            <th style="${thStyle};">タイトル</th>
                            <th style="${thStyle}; width:90px;">譜面</th>
                            <th style="${thStyle}; width:90px;">プレイ回数</th>
                            <th style="${thStyle}; width:90px;">定数</th>
                            <th style="${thStyle}; width:90px;">単曲レート</th>
                            <th style="${thStyle}; width:120px; text-align:right;">スコア / ランク</th>
                        </tr>
                    </thead>
                    <tbody style="color:#e7f1ff;">${newRows}</tbody>
                </table>
            </div>
        `;

        // build a combined diff table for all songs (BEST then NEW)
        const buildDiffRows = (lists) => {
            let idx = 0;
            return lists.flatMap(section => {
                return section.map(song => {
                    idx++;
                    const seedScore = Number.isFinite(song.seed_score_int) ? song.seed_score_int : null;
                    const detailScore = Number.isFinite(song.detail_score_int) ? song.detail_score_int : (Number.isFinite(song.score_int) ? song.score_int : null);
                    const delta = (seedScore !== null && detailScore !== null) ? (detailScore - seedScore) : 0;
                    const mismatch = delta !== 0;
                    return {
                        no: idx,
                        kind: song._source || '',
                        title: song.title,
                        diff: song.difficulty || '',
                        idxParam: song.params?.idx || '',
                        diffParam: song.params?.diff || '',
                        seed: seedScore,
                        detail: detailScore,
                        delta,
                        const: Number.isFinite(song.const) ? song.const.toFixed(2) : '',
                        mismatch,
                    };
                });
            });
        };

        const combined = buildDiffRows([bestList, newList]);
        const diffRowsHtml = combined.map(row => {
            const rowStyle = row.mismatch ? 'background: rgba(255,100,100,0.04);' : '';
            return `
                <tr style="${rowStyle}">
                    <td style="padding:6px 8px; text-align:right;">${row.no}</td>
                    <td style="padding:6px 8px;">${escapeHtml(row.kind)}</td>
                    <td style="padding:6px 8px;">${escapeHtml(row.title)}</td>
                    <td style="padding:6px 8px; text-align:center;">${escapeHtml(row.diff)}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(row.idxParam)}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(row.diffParam)}</td>
                    <td style="padding:6px 8px; text-align:right;">${row.seed ?? '-'}</td>
                    <td style="padding:6px 8px; text-align:right;">${row.detail ?? '-'}</td>
                    <td style="padding:6px 8px; text-align:right;">${row.delta}</td>
                    <td style="padding:6px 8px; text-align:right;">${escapeHtml(row.const)}</td>
                </tr>`;
        }).join('');

        const diffTableHtml = `
            <div style="margin-top:18px;">
                <div style="font-weight:700; color:#ffd27a; margin-bottom:6px;">差分一覧（種 vs 詳細）</div>
                <div style="max-height:280px; overflow:auto; border:1px solid rgba(255,255,255,0.04); padding:8px; border-radius:8px;">
                    <table style="${tableStyle}">
                        <thead>
                            <tr>
                                <th style="${thStyle}; width:40px;">No.</th>
                                <th style="${thStyle}; width:60px;">種別</th>
                                <th style="${thStyle};">タイトル</th>
                                <th style="${thStyle}; width:80px;">譜面</th>
                                <th style="${thStyle}; width:60px;">idx</th>
                                <th style="${thStyle}; width:60px;">diff</th>
                                <th style="${thStyle}; width:100px; text-align:right;">seed</th>
                                <th style="${thStyle}; width:100px; text-align:right;">detail</th>
                                <th style="${thStyle}; width:80px; text-align:right;">Δ</th>
                                <th style="${thStyle}; width:80px; text-align:right;">定数</th>
                            </tr>
                        </thead>
                        <tbody style="color:#e7f1ff;">${diffRowsHtml}</tbody>
                    </table>
                </div>
            </div>
        `;

        // append diff table
        const finalHtml = html + diffTableHtml;

        let debugHtml = '';
        if (diagnostics && diagnostics.length) {
            debugHtml = '<div style="margin-top:12px; color:#9fb7d9;"><strong>DEBUG</strong><pre style="white-space:pre-wrap;">' + escapeHtml(JSON.stringify(diagnostics, null, 2)) + '</pre></div>';
        }

        return finalHtml + debugHtml;
    };

    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    const generateExcelTSV = (player, bestList, newList) => {
        const sep = '\t';
        const lines = [];
        lines.push(`ユーザー\t${player.name}`);
        lines.push(`現在レーティング\t${Number(player.rating).toFixed(2)}`);
        lines.push('');

        const header = ['No.', 'タイトル', '譜面', 'プレイ回数', '定数', '単曲レート', 'スコア', 'ランク'].join(sep);
        lines.push('BEST');
        lines.push(header);
        bestList.forEach((song, idx) => {
            const rank = getRankInfo(song.score_int).rank;
            const row = [
                String(idx + 1),
                String((song.title || '').replace(/\t|\n|\r/g, ' ')),
                String(song.difficulty || ''),
                String(song.playCount || ''),
                String(Number.isFinite(song.const) ? song.const.toFixed(2) : ''),
                String(Number.isFinite(song.rating) ? song.rating.toFixed(2) : ''),
                String(song.score_str || song.score_int || ''),
                String(rank),
            ].join(sep);
            lines.push(row);
        });

        lines.push('');
        lines.push('NEW');
        lines.push(header);
        newList.forEach((song, idx) => {
            const rank = getRankInfo(song.score_int).rank;
            const row = [
                String(idx + 1),
                String((song.title || '').replace(/\t|\n|\r/g, ' ')),
                String(song.difficulty || ''),
                String(song.playCount || ''),
                String(Number.isFinite(song.const) ? song.const.toFixed(2) : ''),
                String(Number.isFinite(song.rating) ? song.rating.toFixed(2) : ''),
                String(song.score_str || song.score_int || ''),
                String(rank),
            ].join(sep);
            lines.push(row);
        });

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
        const diagnostics = createDiagnostics();
        window.__ratnatorDebug = diagnostics.entries;
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
            diagnostics.log('player', {
                name: player.name,
                rating: player.rating,
                overPower: player.overPower,
                playCount: player.playCount,
                currentPlayCount: player.currentPlayCount,
            });
            overlayRefs.statusEl.innerHTML = `ユーザー: <span style="color:#8df0c9;">${player.name}</span><br>レーティングを解析しました`;

            const constData = await fetch(CONST_DATA_URL).then(response => response.json());
            diagnostics.log('const', { count: Array.isArray(constData) ? constData.length : 0 });
            overlayRefs.statusEl.innerHTML += '<br>定数データを取得しました';

            const paidResult = await fetchAllSongsForPaidUserViaRecord(SONG_DETAIL_DELAY_SEC, constData, { debug: diagnostics });
            const detailedOldSongs = paidResult.detailedOldSongs;
            const detailedNewSongs = paidResult.detailedNewSongs;

            diagnostics.log('final', {
                bestCount: detailedOldSongs.length,
                newCount: detailedNewSongs.length,
            });

            const frameLists = buildFrameLists(detailedOldSongs, detailedNewSongs);
            const bestList = frameLists.best;
            const newList = frameLists.recent;
            reportText = renderTextReport(player, bestList, newList, diagnostics.entries);
            overlayRefs.body.innerHTML = renderHtmlReport(player, bestList, newList, diagnostics.entries);
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

            overlayRefs.excelButton.addEventListener('click', async () => {
                try {
                    const tsv = generateExcelTSV(player, bestList, newList);
                    await navigator.clipboard.writeText(tsv);
                    overlayRefs.excelButton.textContent = 'コピー完了';
                    setTimeout(() => {
                        overlayRefs.excelButton.textContent = 'Excel用コピー';
                    }, 1500);
                } catch (error) {
                    overlayRefs.excelButton.textContent = 'コピー失敗';
                    setTimeout(() => {
                        overlayRefs.excelButton.textContent = 'Excel用コピー';
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
