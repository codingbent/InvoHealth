const express = require("express");
const router = express.Router();
const fetchadmin = require("../../../middleware/fetchadmin");
const Country = require("../../../models/Country");

router.post("/update_country", fetchadmin, async (req, res) => {
    try {
        const { code, ...updates } = req.body;

        const country = await Country.findOneAndUpdate(
            { code },
            { $set: updates },
            { new: true, upsert: true },
        );

        res.json({
            success: true,
            country,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
