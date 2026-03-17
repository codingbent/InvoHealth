const express = require("express");
const router = express.Router();
const Doc = require("../../../models/Doc");
const Pricing =require("../../../models/Pricing");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/check_invoice_limit", fetchuser, async (req, res) => {
    try {
        const doctor = await Doc.findById(req.user.doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const pricing = await Pricing.findOne();

        const plan = doctor.subscription.plan.toLowerCase();

        const limit = pricing[plan].invoiceLimit;

        const used = doctor.usage.invoiceDownloads || 0;

        if (limit !== -1 && used >= limit) {
            return res.status(403).json({
                success: false,
                error: "Invoice download limit reached",
            });
        }

        res.json({
            success: true,
            used,
            remaining: limit === -1 ? -1 : limit - used,
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports=router;