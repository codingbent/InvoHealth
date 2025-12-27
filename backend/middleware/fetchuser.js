const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const fetchuser = (req, res, next) => {
    const token = req.header("auth-token");
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);

        if (!data.user) {
            return res.status(401).json({ error: "Invalid token structure" });
        }

        req.user = data.user; // ✅ ONLY THIS
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = fetchuser;
