const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/set_password", async (req, res) => {
    const { staffId, password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({
            success: false,
            error: "Password must be at least 6 characters",
        });
    }

    const staff = await Staff.findById(staffId);
    if (!staff || staff.password) {
        return res.status(400).json({
            success: false,
            error: "Invalid request",
        });
    }

    const salt = await bcrypt.genSalt(10);
    staff.password = await bcrypt.hash(password, salt);
    await staff.save();

    const token = jwt.sign(
        {
            user: {
                id: staff._id,
                role: "staff",
                staffRole: staff.role,
                doctorId: staff.doctorId,
            },
        },
        JWT_SECRET,
        { expiresIn: "1d" },
    );

    res.json({ success: true, token, role: "staff", name: staff.name });
});

module.exports = router;
