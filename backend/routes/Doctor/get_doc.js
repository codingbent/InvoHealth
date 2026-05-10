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
            .populate(
                "address.countryId",
                "timezone code name currency dialCode",
            ) // already correct
            .populate("paymentMethods.categoryId", "name")
            .populate("paymentMethods.subCategoryId", "name");

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        // ───── PHONE DECRYPTION ─────
        let needsPhoneUpdate = false;
        let plainPhone = "";

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
            }
        } else if (doc.phone) {
            phoneToSend = doc.phone;
        }

        // ───── APPOINTMENT PHONE ─────
        let appointmentPhoneToSend = "";

        if (doc.appointmentPhoneEncrypted) {
            try {
                appointmentPhoneToSend = decrypt(doc.appointmentPhoneEncrypted);
            } catch (err) {
                console.error("Decrypt error:", err.message);
            }
        } else if (doc.appointmentPhone) {
            appointmentPhoneToSend = doc.appointmentPhone;
        }

        // ───── RESPONSE ─────
        res.json({
            success: true,
            doctor: {
                id: doc._id,
                name: doc.name,
                email: doc.email,
                clinicName: doc.clinicName,

                // PHONE
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

                // ADDRESS
                address: {
                    line1: doc.address?.line1 || "",
                    line2: doc.address?.line2 || "",
                    line3: doc.address?.line3 || "",
                    city: doc.address?.city || "",
                    state: doc.address?.state || "",
                    pincode: doc.address?.pincode || "",
                    countryId: doc.address?.countryId?._id || "",
                    country: doc.address?.countryId?.name || "",
                    currency: doc.address?.countryId?.currency || "",
                    dialCode: doc.address?.countryId?.dialCode || "",
                },
                timezone: doc.address?.countryId?.timezone || null,

                countryCode: doc.address?.countryId?.dialCode || "",

                // PROFESSIONAL
                degree: doc.degree || [],
                specialization: doc.specialization || [],
                doctorType: doc.doctorType || [],
                experience: doc.experience,
                regNumber: doc.regNumber,

                // META
                subscription: doc.subscription,
                usage: doc.usage,
                staffCount: doc.staff?.length || 0,

                dialCode: doc.address?.countryId?.dialCode || "",

                // PAYMENTS
                paymentMethods: doc.paymentMethods || [],
            },
        });
    } catch (error) {
        console.error("GET DOC ERROR:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
