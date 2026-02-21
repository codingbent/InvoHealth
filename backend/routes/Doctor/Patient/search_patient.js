const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/search_patient", fetchuser, async (req, res) => {
    try {
        const q = req.query.q?.trim();

        if (!q) {
            return res.json([]);
        }

        const patients = await Patient.find({
            doctor: req.user.doctorId,
            $or: [
                { name: { $regex: q, $options: "i" } },
                { number: { $regex: q } },
            ],
        })
            .limit(10)
            .select("name number gender age");

        res.json(patients);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
