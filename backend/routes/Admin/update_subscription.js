const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
var fetchuser = require("../../middleware/fetchuser");

router.put("/update_subscription/:id", fetchuser, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const { plan } = req.body;

        const updated = await Doc.findByIdAndUpdate(
            req.params.id,
            { "subscription.plan": plan },
            { new: true },
        );

        if (!updated) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
module.exports = router;
