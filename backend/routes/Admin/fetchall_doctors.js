const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const Admin = require("../../models/Admin");
var fetchuser = require("../../middleware/fetchuser");

router.get("/fetchall_doctors", fetchuser, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
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

        const total = await Doc.countDocuments();

        res.status(200).json({
            success: true,
            page,
            totalPages: Math.ceil(total / limit),
            totalDoctors: total,
            doctors,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
module.exports = router;
