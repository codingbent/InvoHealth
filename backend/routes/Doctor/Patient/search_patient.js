const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const fetchuser = require("../../../middleware/fetchuser");
const { decrypt } = require("../../../utils/crypto");

router.get("/search_patient", fetchuser, async (req, res) => {
    try {
        const q = req.query.q?.trim();

        if (!q) return res.json([]);

        const doctorId = req.user.doctorId;

        const cleanQ = q.replace(/\D/g, "");

        //  Step 1: DB filter (fast)
        const patients = await Patient.find({
            doctor: doctorId,
            $or: [
                { name: { $regex: q, $options: "i" } },
                { numberLast4: { $regex: cleanQ.slice(-4) } },
            ],
        })
            .limit(20)
            .select("name gender age numberEncrypted numberLast4 number");

        //  Step 2: JS filter (for full number)
        const filtered = patients.filter((p) => {
            // name match
            if (p.name?.toLowerCase().includes(q.toLowerCase())) return true;

            // last4 match
            if (p.numberLast4?.includes(cleanQ)) return true;

            //  encrypted number match
            if (p.numberEncrypted) {
                try {
                    const num = decrypt(p.numberEncrypted)
                        .toString()
                        .replace(/\D/g, "");

                    if (num.includes(cleanQ)) return true;
                } catch {}
            }

            // fallback (old data)
            if (p.number) {
                if (p.number.replace(/\D/g, "").includes(cleanQ)) return true;
            }

            return false;
        });

        //  Step 3: return clean data
        const result = filtered.slice(0, 10).map((p) => ({
            _id: p._id,
            name: p.name,
            gender: p.gender,
            age: p.age,
            number: p.numberLast4 ? `******${p.numberLast4}` : "",
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
