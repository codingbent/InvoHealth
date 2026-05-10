const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Staff = require("../../../models/Staff");
const Doctor = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const { decrypt } = require("../../../utils/crypto");

router.get("/reveal_phone/:id", fetchuser, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.findOne({
            _id: req.params.id,
            doctorId,
            isDeleted: false,
        }).select("+phoneEncrypted");

        if (!staff || !staff.phoneEncrypted) {
            return res.status(404).json({
                success: false,
                error: "Phone not found",
            });
        }
        

        const phone = decrypt(staff.phoneEncrypted);

        return res.json({
            success: true,
            phone,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
