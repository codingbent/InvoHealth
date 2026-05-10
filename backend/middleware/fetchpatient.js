const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
    // FIX 1: Reject if JWT_SECRET is not configured
    if (!JWT_SECRET) {
        console.error("FATAL: JWT_SECRET is not set in environment variables");
        return res
            .status(500)
            .json({ success: false, error: "Server misconfiguration" });
    }

    const token = req.header("auth-token");

    if (!token) {
        return res
            .status(401)
            .json({ success: false, error: "Authentication required" });
    }

    // FIX 2: Sanitize token length to prevent DoS via giant payloads
    if (typeof token !== "string" || token.length > 2048) {
        return res
            .status(401)
            .json({ success: false, error: "Invalid token format" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET, {
            algorithms: ["HS256"], // FIX 3: Pin algorithm — prevents "alg:none" attacks
        });

        // FIX 4: Validate token payload structure before trusting it
        if (!data?.patient?.id || data?.patient?.role !== "patient") {
            return res
                .status(401)
                .json({ success: false, error: "Invalid token payload" });
        }

        req.patient = data.patient;
        next();
    } catch (err) {
        // FIX 5: Don't leak JWT error details (TokenExpiredError, JsonWebTokenError, etc.)
        const isExpired = err.name === "TokenExpiredError";
        return res.status(401).json({
            success: false,
            error: isExpired
                ? "Session expired. Please log in again."
                : "Invalid token",
        });
    }
};
