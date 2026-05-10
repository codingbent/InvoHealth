const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Patient = require("../../../models/Patient");
const fetchuser = require("../../../middleware/fetchuser");
const { decrypt } = require("../../../utils/crypto");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/search_patient", fetchuser, async (req, res) => {
    try {
        const q = (req.query.q || "").trim();

        const doctorIdRaw =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        if (!doctorIdRaw) {
            return res.json([]);
        }

        const doctorId = new mongoose.Types.ObjectId(doctorIdRaw);

        const baseQuery = {
            doctors: { $in: [doctorId] },
        };

        const mapPatient = (p) => ({
            _id: p._id,
            name: p.name,
            gender: p.gender,
            age: p.age,
            number: p.numberLast4 ? `******${p.numberLast4}` : "",
        });

        // Show all patients linked to this doctor when search is empty
        if (!q) {
            const patients = await Patient.find(baseQuery)
                .select("name gender age numberLast4")
                .sort({ name: 1 })
                .limit(20)
                .lean();

            return res.json(patients.map(mapPatient));
        }

        if (q.length > 50) {
            return res.status(400).json({ error: "Search query too long" });
        }

        const cleanQ = q.replace(/\D/g, "");
        const safeQ = escapeRegex(q);

        // Name search OR phone search
        const orConditions = [{ name: { $regex: safeQ, $options: "i" } }];

        if (cleanQ.length >= 3) {
            orConditions.push({ numberLast4: cleanQ.slice(-4) });
        }

        const patients = await Patient.find({
            ...baseQuery,
            $or: orConditions,
        })
            .select("name gender age numberEncrypted numberLast4")
            .limit(10)
            .lean();

        // Extra phone validation for longer numeric searches
        const filtered = [];
        for (const p of patients) {
            if (cleanQ.length >= 6 && p.numberEncrypted) {
                try {
                    const num = decrypt(p.numberEncrypted)
                        .toString()
                        .replace(/\D/g, "");
                    if (num.includes(cleanQ)) filtered.push(p);
                } catch {}
            } else {
                filtered.push(p);
            }
        }

        return res.json(filtered.slice(0, 10).map(mapPatient));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
