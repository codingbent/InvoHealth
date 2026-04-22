const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const fetchuser = require("../../../middleware/fetchuser");
const { decrypt } = require("../../../utils/crypto");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/search_patient", fetchuser, async (req, res) => {
    try {
        let q = req.query.q?.trim();

        if (!q) return res.json([]);

        if (q.length > 50) {
            return res.status(400).json({
                error: "Search query too long",
            });
        }

        const doctorId = req.user.doctorId;
        const cleanQ = q.replace(/\D/g, "");

        let patients = [];

        // ================= NAME SEARCH =================
        if (q.length >= 2 && isNaN(q)) {
            const safeQ = escapeRegex(q);

            patients = await Patient.find({
                doctor: doctorId,
                name: { $regex: safeQ, $options: "i" },
            })
                .select("name gender age numberLast4")
                .limit(10)
                .lean();

            return res.json(
                patients.map((p) => ({
                    _id: p._id,
                    name: p.name,
                    gender: p.gender,
                    age: p.age,
                    number: p.numberLast4 ? `******${p.numberLast4}` : "",
                })),
            );
        }

        // ================= PHONE SEARCH =================
        if (cleanQ.length >= 3) {
            const last4 = cleanQ.slice(-4);

            const candidates = await Patient.find({
                doctor: doctorId,
                numberLast4: last4,
            })
                .select("name gender age numberEncrypted numberLast4 number")
                .limit(10)
                .lean();

            const filtered = [];

            for (const p of candidates) {
                if (cleanQ.length >= 6 && p.numberEncrypted) {
                    try {
                        const num = decrypt(p.numberEncrypted)
                            .toString()
                            .replace(/\D/g, "");
                        if (num.includes(cleanQ)) {
                            filtered.push(p);
                        }
                    } catch {}
                } else {
                    filtered.push(p);
                }
            }

            return res.json(
                filtered.slice(0, 10).map((p) => ({
                    _id: p._id,
                    name: p.name,
                    gender: p.gender,
                    age: p.age,
                    number: p.numberLast4 ? `******${p.numberLast4}` : "",
                })),
            );
        }

        return res.json([]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
