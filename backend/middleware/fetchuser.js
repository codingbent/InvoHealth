const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const fetchuser = (req, res, next) => {
    const token = req.header("auth-token");
    if (!token) {
        return res.status(401).json({
            success: false,
            error: "NO_TOKEN",
        });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);

        if (!data.user) {
            return res.status(401).json({
                success: false,
                error: "INVALID_TOKEN",
            });
        }

        req.user = data.user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                error: "TOKEN_EXPIRED",
            });
        }

        return res.status(401).json({
            success: false,
            error: "INVALID_TOKEN",
        });
    }
};

module.exports = fetchuser;
