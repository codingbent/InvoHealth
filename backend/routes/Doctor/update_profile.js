const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
var fetchuser = require("../../middleware/fetchuser");

router.put("/update_profile", fetchuser, async (req, res) => {
    try {
        const updated = await Doc.findByIdAndUpdate(
            req.user.doctorId,
            { $set: req.body },
            { new: true },
        );

        return res.json({ success: true, doctor: updated });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
