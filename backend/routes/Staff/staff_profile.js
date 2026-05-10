const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const fetchuser = require("../../middleware/fetchuser");
const { decrypt } = require("../../utils/crypto");

// GET /api/staff/staff_profile
// Returns profile info — phone is masked, NOT decrypted.
// Decryption only happens via /reveal_phone on explicit user action.
router.get("/staff_profile", fetchuser, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id)
            // phoneEncrypted NOT selected here — we don't send decrypted phone on every load
            .populate("countryId", "dialCode flag");

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        return res.json({
            success: true,
            staff: {
                _id: staff._id,
                name: staff.name,
                role: staff.role,

                country: staff.countryId
                    ? {
                          dialCode: staff.countryId.dialCode,
                          flag: staff.countryId.flag,
                      }
                    : null,

                // send masked number only — never send decrypted on profile load
                phoneLast4: staff.phoneLast4,

                isActive: staff.isActive,
            },
        });
    } catch (err) {
        console.error("staff_profile error:", err);

        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

// GET /api/staff/reveal_phone
// Explicit on-demand decryption — only called when staff clicks the eye button.
router.get("/reveal_phone", fetchuser, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id)
            .select("+phoneEncrypted")
            .populate("countryId", "dialCode");

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        if (!staff.phoneEncrypted) {
            return res.status(404).json({
                success: false,
                error: "Phone not available",
            });
        }

        let phone = null;

        try {
            phone = decrypt(staff.phoneEncrypted);
        } catch (err) {
            console.error("Phone decrypt error:", err);

            return res.status(500).json({
                success: false,
                error: "Failed to decrypt phone",
            });
        }

        return res.json({
            success: true,
            // return local number only — frontend prepends dialCode for display
            phone,
        });
    } catch (err) {
        console.error("reveal_phone error:", err);

        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
