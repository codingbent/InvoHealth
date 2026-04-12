const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
var fetchadmin = require("../../middleware/fetchadmin");

router.get("/get_doctor_phone/:id", fetchadmin, async (req, res) => {
    try {
        if (req.admin.role !== "superadmin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const doc = await Doc.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        const { decrypt } = require("../../utils/crypto");

        const phone = doc.phoneEncrypted
            ? decrypt(doc.phoneEncrypted)
            : null;

        res.json({ success: true, phone });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports=router