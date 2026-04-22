const express = require("express");
const router = express.Router();
const Country = require("../../../models/Country");
const fetchadmin = require("../../../middleware/fetchadmin");

router.put("/multiplier/:code", fetchadmin, async (req, res) => {
    try {
        const { multiplier } = req.body;

        const updated = await Country.findOneAndUpdate(
            { code: req.params.code },
            { multiplier },
            { new: true },
        );

        res.json({ success: true, updated });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.put("/rate/:code", fetchadmin, async (req, res) => {
    try {
        const { rate } = req.body;
        const updated = await Country.findOneAndUpdate(
            { code: req.params.code },
            { rate },
            { new: true },
        );
        res.json({ success: true, updated });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
