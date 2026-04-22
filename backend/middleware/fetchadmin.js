const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const token = req.header("admin-token");

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "NO_ADMIN_TOKEN",
        });
    }

    try {
        const data = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

        // CRITICAL: enforce token type
        if (!data.user || data.user.tokenType !== "admin") {
            return res.status(401).json({
                success: false,
                error: "INVALID_ADMIN_TOKEN",
            });
        }

        // OPTIONAL: enforce role existence
        if (!data.user.role) {
            return res.status(403).json({
                success: false,
                error: "ROLE_MISSING",
            });
        }

        req.admin = data.user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: "INVALID_TOKEN",
        });
    }
};
