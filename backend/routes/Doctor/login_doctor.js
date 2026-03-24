const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const normalizePhone = (phone) =>
    phone ? phone.replace(/\D/g, "").slice(-10) : "";

router.post("/login_doctor", async (req, res) => {
    const { identifier, password, identifierType } = req.body;

    try {
        let user = null;

        if (identifierType === "email") {
            user = await Doc.findOne({ email: identifier });
        }

        // ================= PHONE LOGIN =================
        else if (identifierType === "phone") {
            const cleanPhone = normalizePhone(identifier);

            // 🔍 Step 1: narrow down using last4
            const candidates = await Doc.find({
                phoneLast4: cleanPhone.slice(-4),
            });

            // 🔐 Step 2: compare hash
            for (let doc of candidates) {
                if (!doc.phoneHash) continue;

                const isMatch = await bcrypt.compare(cleanPhone, doc.phoneHash);

                if (isMatch) {
                    user = doc;
                    break;
                }
            }
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid identifier type",
            });
        }

        // ================= VALIDATION =================
        if (!user || !user.password) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const payload = {
            user: {
                id: user._id,
                role: "doctor",
                doctorId: user._id,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            success: true,
            authtoken,
            role: "doctor",
            name: user.name,
            doctorId: user._id,
            subscription: user.subscription || null,
        });
    } catch (err) {
        console.error("Doctor Login Error:", err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
