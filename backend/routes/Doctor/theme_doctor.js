const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
var fetchuser = require("../../middleware/fetchuser");

router.put("/theme_doctor", fetchuser, async (req, res) => {
    try {
        const { theme } = req.body;

        if (!theme || !["light", "dark"].includes(theme)) {
            return res.status(400).json({ error: "Invalid theme value" });
        }

        let user;

        if (req.user.role === "doctor") {
            user = await Doc.findByIdAndUpdate(
                req.user.id,
                { theme },
                { new: true },
            );
        } else if (req.user.role === "staff") {
            const Staff = require("../../models/Staff");
            user = await Staff.findByIdAndUpdate(
                req.user.id,
                { theme },
                { new: true },
            );
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            success: true,
            theme: user.theme,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});
module.exports = router;
