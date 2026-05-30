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

    const fetchDetailForSeed = async (seed) => {
        if (!seed) return seed;
        const url = seed.detailSendUrl || URL_RANKING_DETAIL_SEND;
        try {
            const diffSelectors = [
                'input[name="diff"]',
                '.musicdata_detail_difficulty',
                '.music_difficulty',
                '.musicdata_difficulty',
                '.music_detail_diff',
                '.detail_diff',
                '.diff_label',
            ];
            let diffRaw = '';
            // 1) try input value
            const inputDiff = doc.querySelector('input[name="diff"]');
            if (inputDiff && inputDiff.value) diffRaw = String(inputDiff.value).trim();
            // 2) try known selectors' innerText
            if (!diffRaw) {
                for (const sel of diffSelectors) {
                    try {
                        const el = doc.querySelector(sel);
                        if (el) {
                            const t = (el.innerText || el.textContent || '').trim();
                            if (t) { diffRaw = t; break; }
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            const normalizeDiff = (raw) => {
                if (!raw) return null;
                const s = String(raw).trim();
                // numeric
                const num = s.match(/([0-4])/);
                if (num) return String(num[1]);
                const lower = s.toLowerCase();
                // english keywords
                if (/\b(basic|bas)\b/.test(lower)) return '0';
                if (/\b(advanced|adv)\b/.test(lower)) return '1';
                if (/\b(expert|exp)\b/.test(lower)) return '2';
                if (/\b(master|mas)\b/.test(lower)) return '3';
                if (/\b(ultima|ult|ultimate)\b/.test(lower)) return '4';
                // fallback null
                return null;
            };

            if (diffRaw) {
                const normalized = normalizeDiff(diffRaw);
                if (normalized !== null && seed.params) {
                    if (String(seed.params.diff) !== String(normalized)) {
                        try { console.info('[Ratnator][Diagnostics] diff override', { title: seed.title, from: seed.params.diff, to: normalized, raw: diffRaw }); } catch (e) { }
                        seed.params.diff = String(normalized);
                    }
                }
            }
            try { console.info('[Ratnator][Diagnostics] diff override (multi)', { title: seed.title, from: seed.params.diff, to: normalizedDiff }); } catch (e) { }
            seed.params.diff = normalizedDiff;
        }
                    }
}
            } catch (e) { /* ignore multi-diff parse errors */ }
// try to extract difficulty from detail page and normalize to diff code (0-4)
try {
    const diffSelectors = [
        'input[name="diff"]',
        '.music_difficulty',
        '.musicdata_difficulty',
        '.music_detail_diff',
        '.detail_diff',
        '.diff_label',
    ];
    let diffRaw = '';
    // 1) try input value
    const inputDiff = doc.querySelector('input[name="diff"]');
    if (inputDiff && inputDiff.value) diffRaw = String(inputDiff.value).trim();
    // 2) try known selectors' innerText
    if (!diffRaw) {
        for (const sel of diffSelectors) {
            try {
                const el = doc.querySelector(sel);
                if (el) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t) { diffRaw = t; break; }
                }
            } catch (e) { /* ignore */ }
        }
    }

    if (diffRaw) {
        const map = { 'bas': '0', 'basic': '0', '0': '0', 'adv': '1', 'advanced': '1', '1': '1', 'exp': '2', 'expert': '2', '2': '2', 'mas': '3', 'master': '3', '3': '3', 'ult': '4', 'ultima': '4', 'ultima': '4', '4': '4' };
        const clean = String(diffRaw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalized = map[clean];
        if (normalized !== undefined && seed.params) {
            if (String(seed.params.diff) !== String(normalized)) {
                try { console.info('[Ratnator][Diagnostics] diff override', { title: seed.title, from: seed.params.diff, to: normalized }); } catch (e) { }
                seed.params.diff = String(normalized);
            }
        }
    }
} catch (e) { /* ignore difficulty parse errors */ }
if (stats) {
    if (stats.scoreInt && stats.scoreInt > 0) {
        seed.score_int = stats.scoreInt;
        seed.score_str = stats.scoreStr || seed.score_str;
    }
    if (stats.playCount) seed.playCount = stats.playCount;
}
        } catch (err) {
    try { console.warn('[Ratnator] fetchDetailForSeed failed', { title: seed.title, err: String(err) }); } catch (e) { }
}
return seed;
    };

const fetchDetailsForSeeds = async (seeds, label = '') => {
    if (!Array.isArray(seeds) || seeds.length === 0) return seeds;
    try { console.info('[Ratnator][Diagnostics] fetchDetailsForSeeds start', { label, count: seeds.length }); } catch (e) { }
    for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        await fetchDetailForSeed(s);
        try { if (window.__ratnatorUpdateProgress) window.__ratnatorUpdateProgress(25 + Math.floor((i / seeds.length) * 50), `Detail ${label}: ${i + 1}/${seeds.length}`); } catch (e) { }
        await sleep(SONG_DETAIL_DELAY_SEC * 1000);
    }
    try { console.info('[Ratnator][Diagnostics] fetchDetailsForSeeds done', { label }); } catch (e) { }
    return seeds;
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

// === Runtime options (can be changed via UI later) ===
// MATCH_MODE: 'exact' (title+diff), 'title' (title-only)
let MATCH_MODE = 'exact';
let BEST_CONST_THRESHOLD = 14.5;
let NEW_CONST_THRESHOLD = 13.5;
let APPLY_CONST_THRESHOLD = false;

const normalizeTitle = (title = '') => String(title)
    .normalize('NFKC')
    .replace(/\u3000/g, ' ')
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ')
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .toLowerCase();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// diagnostics helper removed in production build

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

/**
 * Parse a score-like string and return numeric value.
 * Prefers matches of 6+ digits to avoid picking up small numbers.
 * @param {string} text
 * @returns {{scoreStr:string, scoreInt:number}}
 */
const parseScoreFromText = (text) => {
    if (!text) return { scoreStr: '', scoreInt: 0 };
    const normalized = String(text).normalize('NFKC').replace(/\s+/g, '');
    // primary: contiguous digits (with optional commas) of length >=6
    let match = normalized.match(/\d[\d,]{5,}/);
    if (!match) {
        // fallback: collect digit groups (and comma-separated groups) and pick the longest
        const groups = normalized.match(/[\d,]+/g) || [];
        let best = '';
        for (const g of groups) {
            const digitsOnly = g.replace(/,/g, '');
            if (digitsOnly.length >= 6 && digitsOnly.length > best.replace(/,/g, '').length) {
                best = g;
            }
        }
        if (best) match = [best];
    }
    if (!match) return { scoreStr: '', scoreInt: 0 };
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

/**
 * Try an array of selectors on a root and return the first non-empty text.
 * @param {Document|Element} root
 * @param {string|string[]} selectors
 * @returns {string}
 */
const getTextFromSelectors = (root, selectors) => {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
        try {
            const el = root.querySelector(sel);
            if (el) {
                const t = (el.innerText || el.textContent || '').trim();
                if (t) return t;
            }
        } catch (e) { /* ignore invalid selectors */ }
    }
    return '';
};

/**
 * Find numeric text near labels matching the provided patterns.
 * Used as a fallback when selector-based extraction fails.
 * @param {Document|Element} root
 * @param {RegExp|RegExp[]} labelPatterns
 * @returns {string}
 */
const extractTextByLabel = (root, labelPatterns) => {
    const patterns = Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns];
    const nodes = root.querySelectorAll('*');
    for (const node of nodes) {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        if (!patterns.some(pattern => pattern.test(text))) continue;

        const numbers = text.match(/\d[\d,]{5,}(?:\.\d+)?/g) || text.match(/\d[\d,]*(?:\.\d+)?/g);
        if (numbers && numbers.length) return numbers[numbers.length - 1];

        const neighbors = [node.nextElementSibling, node.parentElement?.nextElementSibling];
        for (const neighbor of neighbors) {
            if (!neighbor) continue;
            const neighborText = (neighbor.textContent || neighbor.innerText || '').replace(/\s+/g, ' ').trim();
            const neighborNumbers = neighborText.match(/\d[\d,]{5,}(?:\.\d+)?/g) || neighborText.match(/\d[\d,]*(?:\.\d+)?/g);
            if (neighborNumbers && neighborNumbers.length) return neighborNumbers[neighborNumbers.length - 1];
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

const enrichSongsWithConstData = (constData, songList, label = '') => {
    const diffMap = { BAS: '0', ADV: '1', EXP: '2', MAS: '3', ULT: '4' };
    const diffNameMap = { BAS: 'BASIC', ADV: 'ADVANCED', EXP: 'EXPERT', MAS: 'MASTER', ULT: 'ULTIMA' };
    const reverseDiffMap = { '0': 'BAS', '1': 'ADV', '2': 'EXP', '3': 'MAS', '4': 'ULT' };

    const matchMode = MATCH_MODE || 'exact';
    const applyConstThreshold = APPLY_CONST_THRESHOLD;
    const bestConstThreshold = BEST_CONST_THRESHOLD;
    const newConstThreshold = NEW_CONST_THRESHOLD;

    const songSeedMap = new Map();
    if (matchMode === 'exact') {
        songList.forEach(song => {
            const diffAbbreviation = reverseDiffMap[String(song.params?.diff)];
            if (!diffAbbreviation) return;
            const key = `${normalizeTitle(song.title)}|${diffAbbreviation}`;
            if (!songSeedMap.has(key)) songSeedMap.set(key, song);
        });
    } else {
        songList.forEach(s => {
            const nTitle = normalizeTitle(s.title);
            if (!songSeedMap.has(nTitle)) songSeedMap.set(nTitle, s);
        });
    }

    const rawNewSongs = [];
    const rawOldSongs = [];

    let totalConst = 0;
    let skippedByThreshold = 0;
    let skippedNoMatch = 0;
    let skippedNoScore = 0;
    const skippedSamples = [];

    try {
        console.info('[Ratnator][Diagnostics] enrich start', { label, matchMode, applyConstThreshold, bestConstThreshold, newConstThreshold, seedMapSize: songSeedMap.size, seedListCount: songList.length, constDataCount: constData.length });
    } catch (e) { }

    for (const songData of constData) {
        totalConst++;
        if (!songData || !diffMap[songData.diff]) continue;

        const isNewSong = songData.version === CURRENT_VERSION;

        if (applyConstThreshold) {
            const threshold = isNewSong ? newConstThreshold : bestConstThreshold;
            if (Number(songData.const) < threshold) {
                skippedByThreshold++;
                if (skippedSamples.length < 10) skippedSamples.push({ title: songData.title, diff: songData.diff, const: songData.const, version: songData.version });
                continue;
            }
        }

        let initialSong = null;
        if (matchMode === 'exact') {
            const key = `${normalizeTitle(songData.title)}|${songData.diff}`;
            initialSong = songSeedMap.get(key);
        } else {
            initialSong = songSeedMap.get(normalizeTitle(songData.title));
        }

        if (!initialSong) {
            skippedNoMatch++;
            if (skippedSamples.length < 10) skippedSamples.push({ title: songData.title, diff: songData.diff, reason: 'no-match' });
            continue;
        }

        const scoreInt = (matchMode === 'exact' && Number.isFinite(initialSong.score_int)) ? initialSong.score_int : 0;
        // Main.js behavior: Paid mode (exact) skips if score is 0 or less
        if (matchMode === 'exact' && scoreInt <= 0) {
            skippedNoScore++;
            if (skippedSamples.length < 10) skippedSamples.push({ title: songData.title, diff: songData.diff, reason: 'no-score' });
            continue;
        }

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
            playCount: (initialSong && initialSong.playCount) ? initialSong.playCount : 'N/A',
            params: params,
            jacketUrl: songData.img ? `https://new.chunithm-net.com/chuni-mobile/html/mobile/img/${songData.img}.jpg` : '',
        };

        if (matchMode === 'exact' && scoreInt > 0) {
            songObject.rating = calculateRating(scoreInt, songObject.const);
        }

        if (isNewSong) {
            rawNewSongs.push(songObject);
        } else {
            rawOldSongs.push(songObject);
        }
    }

    const uniqueFilter = (song, index, self) => index === self.findIndex(s => s.title === song.title && s.difficulty === song.difficulty);
    const filteredNewSongs = rawNewSongs.filter(uniqueFilter);
    const filteredOldSongs = rawOldSongs.filter(uniqueFilter);

    console.info('[Ratnator][Diagnostics] Enrich stats', { label, totalConst, newCount: filteredNewSongs.length, oldCount: filteredOldSongs.length, skippedByThreshold, skippedNoMatch, skippedNoScore });
    if (skippedSamples.length) console.info('[Ratnator][Diagnostics] Skipped samples (up to 10):', skippedSamples);

    try { if (window.__ratnatorUpdateProgress) window.__ratnatorUpdateProgress(20, `Enriched ${label}: ${filteredOldSongs.length + filteredNewSongs.length}曲`); } catch (e) { }

    if (String(label).toUpperCase() === 'NEW') return filteredNewSongs;
    if (String(label).toUpperCase() === 'BEST') return filteredOldSongs;
    return filteredOldSongs.concat(filteredNewSongs);
};

const fetchRatingDetailSongSeeds = async (pageUrl, label = '') => {
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

    console.info('[Ratnator] seed', { label, count: initialSongList.length });

    try {
        const samples = initialSongList.slice(0, 20).map(s => ({ title: s.title, idx: s.params?.idx, diff: s.params?.diff, score_int: s.score_int }));
        console.info('[Ratnator][Diagnostics] seed samples', { label, samples });
    } catch (e) { }

    try {
        if (window.__ratnatorUpdateProgress) window.__ratnatorUpdateProgress(5, `Seeds ${label}: ${initialSongList.length}曲`);
    } catch (e) { }

    return initialSongList;
};

// processSongList removed in simplified build

// fetchAllSongsForPaidUserViaRecord removed in simplified build

const buildFrameLists = (detailedOldSongs, detailedNewSongs) => ({
    best: detailedOldSongs.slice(0, MAX_BEST_COUNT),
    recent: detailedNewSongs.slice(0, MAX_NEW_COUNT),
});

const createOverlay = () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; z-index:999999; background:rgba(6,10,18,0.88); display:flex; align-items:center; justify-content:center; padding:20px; box-sizing:border-box; color:#f6f9ff;';

    const panel = document.createElement('div');
    panel.style.cssText = 'width:min(980px,100%); max-height:90vh; overflow:auto; padding:20px; border-radius:12px; background:rgba(12,17,26,0.95); border:1px solid rgba(255,255,255,0.06);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;';
    header.innerHTML = `<div><div style="font-size:13px;color:#8cb4ff;font-weight:700;">Ratnator</div><div style="font-size:18px;color:#e7f1ff;font-weight:700;">Best / New 一覧</div></div><div id="ratnator-status" style="color:#cfe8ff; text-align:right; min-width:160px;"></div>`;

    const closeButton = document.createElement('button');
    closeButton.textContent = '閉じる';
    closeButton.style.cssText = 'appearance:none; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); color:#f6f9ff; padding:8px 12px; border-radius:999px; cursor:pointer;';

    const body = document.createElement('div');
    body.id = 'ratnator-body';
    body.style.cssText = 'font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif; font-size:13px; color:#e7f1ff; line-height:1.4;';

    header.appendChild(closeButton);
    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    closeButton.addEventListener('click', () => {
        overlay.remove();
        window.__ratnatorRunning = false;
    });

    return {
        overlay,
        statusEl: header.querySelector('#ratnator-status'),
        body,
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

const renderHtmlReport = (player, bestList, newList) => {
    const bestAvg = calculateAverageRating(bestList);
    const newAvg = calculateAverageRating(newList);

    const headerHtml = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px;">
                <div>
                    <div style="font-size:13px;color:#8cb4ff;font-weight:700;">CHUNITHM Ratnator</div>
                    <div style="font-size:16px;color:#e7f1ff;font-weight:700;">ユーザー: ${escapeHtml(player.name)} &nbsp; <small style=\"color:#9fbfff;\">(${escapeHtml(player.code || '-')})</small></div>
                    <div style="font-size:12px;color:#cfe8ff; margin-top:6px;">現在レーティング: <strong style=\"color:#8df0c9;\">${Number(player.rating).toFixed(2)}</strong></div>
                </div>
                <div style="text-align:right; color:#cfe8ff; font-size:12px;">
                    <div>Best Ave: <strong>${bestAvg.toFixed(4)}</strong></div>
                    <div>New Ave: <strong>${newAvg.toFixed(4)}</strong></div>
                    <div style="margin-top:6px; font-size:11px; color:#9fbfff;">出力: ${new Date().toLocaleString('ja-JP')}</div>
                </div>
            </div>
        `;

    const makeTable = (list) => {
        if (!list || list.length === 0) return '<div style="color:#cfe8ff;">該当曲なし</div>';
        let rows = list.map((song, idx) => {
            const rankInfo = getRankInfo(song.score_int);
            const scoreText = song.score_str || song.score_int.toLocaleString('en-US');
            const ratingText = Number.isFinite(song.rating) ? song.rating.toFixed(2) : '-';
            const constText = Number.isFinite(song.const) ? song.const.toFixed(2) : '-';
            const playCountText = song.playCount && song.playCount !== 'N/A' ? escapeHtml(String(song.playCount)) : '-';
            const jacket = song.jacketUrl ? `<img src="${song.jacketUrl}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;margin-right:8px;">` : '';
            return `
                    <tr>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04);">${idx + 1}</td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; gap:8px;">${jacket}<div><div style="font-weight:700;color:#e7f1ff;">${escapeHtml(song.title)}</div><div style="font-size:12px;color:#9fbfff;">${escapeHtml(song.artist || '')}</div></div></td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04);">${escapeHtml(song.difficulty)}</td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04); text-align:right;">${constText}</td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04); text-align:right;">${scoreText}</td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04); text-align:center;">${rankInfo.rank}</td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04); text-align:right;">${ratingText}</td>
                        <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04); text-align:right;">${playCountText}</td>
                    </tr>
                `;
        }).join('');

        return `
                <table style="width:100%; border-collapse:collapse; margin-top:8px;">
                    <thead><tr style="color:#9fbfff; font-size:12px; text-align:left;"><th style="padding:8px 10px; width:48px;">No</th><th style="padding:8px 10px;">Title</th><th style="padding:8px 10px; width:92px;">Diff</th><th style="padding:8px 10px; width:76px; text-align:right;">Const</th><th style="padding:8px 10px; width:110px; text-align:right;">Score</th><th style="padding:8px 10px; width:64px; text-align:center;">Rank</th><th style="padding:8px 10px; width:84px; text-align:right;">Rating</th><th style="padding:8px 10px; width:84px; text-align:right;">Play</th></tr></thead>
                    <tbody style="color:#e7f1ff; font-size:13px;">${rows}</tbody>
                </table>
            `;
    };

    const html = `
            ${headerHtml}
            <div style="margin-top:8px;">
                <div style="margin-bottom:8px; font-weight:700; color:#8cb4ff;">BEST枠 (${bestList.length})</div>
                ${makeTable(bestList)}
            </div>
            <div style="margin-top:18px;">
                <div style="margin-bottom:8px; font-weight:700; color:#8cb4ff;">NEW枠 (${newList.length})</div>
                ${makeTable(newList)}
            </div>
        `;
    return html;
};

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" })[s]);

// renderHtmlReport removed in simplified build

// escapeHtml removed in simplified build

// generateExcelTSV removed in simplified build

const showError = (overlayRefs, message) => {
    overlayRefs.statusEl.innerHTML = `<span style="color:#ffb3b3;">エラー</span>`;
    overlayRefs.body.textContent = message;
};

const run = async () => {
    if (window.location.hostname !== 'new.chunithm-net.com') {
        throw new Error('このスクリプトはCHUNITHM-NET内でのみ実行できます。');
    }

    const overlayRefs = createOverlay();
    // diagnostics removed in production build
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
        try { console.info('[Ratnator][Diagnostics] constData length', { count: Array.isArray(constData) ? constData.length : 0 }); } catch (e) { }

        // Simplified flow: only retrieve seeds (BEST/NEW), enrich with const data, and render lists
        const bestSeeds = await fetchRatingDetailSongSeeds(URL_RATING_DETAIL_BEST, 'BEST seed page');
        const recentSeeds = await fetchRatingDetailSongSeeds(URL_RATING_DETAIL_RECENT, 'NEW seed page');
        // Fetch detail pages for each seed to get accurate play count and scores
        await fetchDetailsForSeeds(bestSeeds, 'BEST');
        await fetchDetailsForSeeds(recentSeeds, 'NEW');
        try { console.info('[Ratnator][Diagnostics] seeds', { best: bestSeeds.length, recent: recentSeeds.length }); } catch (e) { }

        const enrichedOldSongs = enrichSongsWithConstData(constData, bestSeeds, 'BEST');
        const enrichedNewSongs = enrichSongsWithConstData(constData, recentSeeds, 'NEW');

        const frameLists = buildFrameLists(enrichedOldSongs, enrichedNewSongs);
        // sort by single-song rating (降順). rating がない場合は 0 として扱う
        const bestList = (frameLists.best || []).slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const newList = (frameLists.recent || []).slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));

        const reportHtml = renderHtmlReport(player, bestList, newList);
        overlayRefs.body.innerHTML = reportHtml;
        overlayRefs.statusEl.innerHTML = `ユーザー: <span style="color:#8df0c9;">${player.name}</span>`;
    } catch (error) {
        console.error(error);
        showError(overlayRefs, error.message || String(error));
    }
};

try {
    await run();
} catch (error) {
    console.error(error);
    window.__ratnatorRunning = false;
    alert(error.message || String(error));
}
}) ();
