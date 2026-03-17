const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

    const token = req.header("admin-token");

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "NO_ADMIN_TOKEN"
        });
    }

    try {

        const data = jwt.verify(token, process.env.JWT_SECRET);

        req.admin = data.admin;

        next();

    } catch (error) {

        res.status(401).json({
            success: false,
            error: "INVALID_TOKEN"
        });

    }
};