const crypto = require("crypto");

// ── Hash helper ──────────────────────────────────────────────────────────────
const hashOtp = (otp) =>
    crypto.createHash("sha256").update(String(otp)).digest("hex");

// ── CSPRNG OTP generator ─────────────────────────────────────────────────────
const generateOtp = () => String(crypto.randomInt(100000, 999999));

// ── OTP TTL ───────────────────────────────────────────────────────────────────
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes


let store;

if (process.env.REDIS_URL) {
    // ── Redis store ──────────────────────────────────────────────────────────
    const Redis = require("ioredis");

    let redisUrl = process.env.REDIS_URL;

    if (
        redisUrl.startsWith("redis://") &&
        redisUrl.includes("upstash.io")
    ) {
        redisUrl = redisUrl.replace("redis://", "rediss://");
        // console.log(
        //     "[OTP Store] Auto-upgraded Redis URL to TLS (rediss://) for Upstash",
        // );
    }

    const client = new Redis(redisUrl, {
        lazyConnect: true,

        enableOfflineQueue: false,

        maxRetriesPerRequest: 1,     // fail fast, don't retry forever
        connectTimeout: 5000,        // 5 s connection timeout
    });

    client.connect().catch((err) => {
        console.error("[OTP Store] Redis initial connection error:", err.message);
        console.error(
            "[OTP Store] Hint: make sure REDIS_URL uses rediss:// for Upstash",
        );
    });

    client.on("error", (err) => {
        // Suppress ECONNRESET noise but keep it visible for real errors
        if (!err.message?.includes("ECONNRESET")) {
            console.error("[OTP Store] Redis error:", err.message);
        }
    });

    store = {
        async get(key) {
            const raw = await client.get(`otp:${key}`);
            return raw ? JSON.parse(raw) : null;
        },
        async set(key, value, ttlMs) {
            await client.set(
                `otp:${key}`,
                JSON.stringify(value),
                "PX",
                ttlMs,
            );
        },
        async delete(key) {
            await client.del(`otp:${key}`);
        },
    };
} else {
    // ── In-memory fallback (single-process dev only) ──────────────────────────
    if (process.env.NODE_ENV === "production") {
        // Hard crash in production — do not silently lose OTPs
        throw new Error(
            "FATAL: REDIS_URL must be set in production. " +
                "OTP store cannot run in-memory across multiple instances.",
        );
    }

    console.warn(
        "[OTP Store] REDIS_URL not set — using in-memory store. " +
            "OTPs will be lost on restart. Set REDIS_URL for production.",
    );

    const map = new Map();

    store = {
        async get(key) {
            const entry = map.get(key);
            if (!entry) return null;
            if (Date.now() > entry.expiresAt) {
                map.delete(key);
                return null;
            }
            return entry;
        },
        async set(key, value, ttlMs) {
            map.set(key, { ...value, expiresAt: Date.now() + ttlMs });
        },
        async delete(key) {
            map.delete(key);
        },
    };
}

module.exports = { store, hashOtp, generateOtp, OTP_TTL_MS };