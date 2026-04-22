const rateLimit = require("express-rate-limit");

// Strict limiter for payment routes
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 requests per IP
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        error: "Too many payment attempts. Please try again later.",
    },

    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            error: "Rate limit exceeded on payment routes",
        });
    },
});

// Slightly relaxed limiter (optional for webhook)
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // PayPal may retry → keep higher
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    paymentLimiter,
    webhookLimiter,
};
