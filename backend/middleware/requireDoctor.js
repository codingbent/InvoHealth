// middleware/requireDoctor.js

module.exports = function requireDoctor(req, res, next) {
    try {
        if (!req.user || req.user.role !== "doctor") {
            return res.status(403).json({
                success: false,
                message: "Access denied: Doctor only",
            });
        }

        next();
    } catch (err) {
        console.error("Role check error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
