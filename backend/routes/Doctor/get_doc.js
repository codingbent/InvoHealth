const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const fetchuser = require("../../middleware/fetchuser");
const { decrypt } = require("../../utils/crypto");

router.get("/get_doc", fetchuser, async (req, res) => {
    try {
        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const doc = await Doc.findById(doctorId)
            .select("-password")
            .populate("address.countryId")
            .populate("paymentMethods.categoryId", "name")
            .populate("paymentMethods.subCategoryId", "name");

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }
        let needsPhoneUpdate = false;
        let plainPhone = "";

        // check old data
        if (!doc.phoneEncrypted && doc.phone) {
            needsPhoneUpdate = true;
            plainPhone = doc.phone;
        }
        let phoneToSend = "";

        if (doc.phoneEncrypted) {
            try {
                phoneToSend = decrypt(doc.phoneEncrypted);
            } catch (err) {
                console.error("Decrypt error:", err.message);
                phoneToSend = "";
            }
        } else if (doc.phone) {
            phoneToSend = doc.phone;
        }

        let appointmentPhoneToSend = "";

        if (doc.appointmentPhoneEncrypted) {
            try {
                appointmentPhoneToSend = decrypt(doc.appointmentPhoneEncrypted);
            } catch (err) {
                console.error("Decrypt error:", err);
            }
        } else if (doc.appointmentPhone) {
            appointmentPhoneToSend = doc.appointmentPhone;
        }

        res.json({
            success: true,
            doctor: {
                id: doc._id,
                name: doc.name,
                email: doc.email,
                clinicName: doc.clinicName,
                phone: phoneToSend,
                phoneMasked: doc.phoneLast4 ? `******${doc.phoneLast4}` : "",
                needsPhoneUpdate,
                plainPhone,
                appointmentPhone: appointmentPhoneToSend,
                appointmentPhoneMasked: doc.appointmentPhoneLast4
                    ? `******${doc.appointmentPhoneLast4}`
                    : "",
                needsAppointmentPhoneUpdate:
                    !doc.appointmentPhoneEncrypted && !!doc.appointmentPhone,
                plainAppointmentPhone: !doc.appointmentPhoneEncrypted
                    ? doc.appointmentPhone
                    : "",
                address: {
                    line1: doc.address?.line1 || "",
                    line2: doc.address?.line2 || "",
                    line3: doc.address?.line3 || "",
                    city: doc.address?.city || "",
                    state: doc.address?.state || "",
                    pincode: doc.address?.pincode || "",
                    country: doc.address?.countryId?.name || "",
                    currency: doc.address?.countryId?.currency || "",
                },
                countryCode: doc?.dialCode || "",
                degree: doc.degree,
                experience: doc.experience,
                regNumber: doc.regNumber,
                subscription: doc.subscription,
                usage: doc.usage,
                staffCount: doc.staff?.length || 0,
                dialCode: doc.address?.countryId?.dialCode || "",
                // ── ADD THIS ──
                paymentMethods: doc.paymentMethods || [],
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});
module.exports = router;
