const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login_doctor", async (req, res) => {
    const { identifier, password, identifierType } = req.body;

    try {
        let user = null;
        let userRole = null;

        if (identifierType === "email") {
            user = await Doc.findOne({ email: identifier });
            if (user) userRole = "doctor";
        }

        if (!user && identifierType === "phone") {
            user = await Doc.findOne({ phone: identifier });
            if (user) userRole = "doctor";
        }

        if (!user && identifierType === "phone") {
            user = await Staff.findOne({ phone: identifier, isActive: true });
            if (user) userRole = user.role;
        }

        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const match = bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const payload = {
            user: {
                id: user._id,
                role: userRole,
                doctorId: userRole === "doctor" ? user._id : user.doctorId,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            success: true,
            authtoken,
            role: userRole,
            name: user.name,
            doctorId: userRole === "doctor" ? user._id : user.doctorId,
            subscription: userRole === "doctor" ? user.subscription : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
