const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
var fetchadmin = require("../../middleware/fetchadmin");
const { decrypt } = require("../../utils/crypto");

router.get("/fetchall_doctors", fetchadmin, async (req, res) => {
    try {
        if (req.admin.role !== "superadmin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const doctors = await Doc.find()
            .select("-password")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const doctorsWithPhone = doctors.map((doc) => {
            const d = doc.toObject();

            return {
                ...d,
                phone: d.phoneEncrypted ? decrypt(d.phoneEncrypted) : null,
                appointmentPhone: d.appointmentPhoneEncrypted
                    ? decrypt(d.appointmentPhoneEncrypted)
                    : null,
            };
        });

        const total = await Doc.countDocuments();

        res.status(200).json({
            success: true,
            page,
            totalPages: Math.ceil(total / limit),
            totalDoctors: total,
            doctors: doctorsWithPhone,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
