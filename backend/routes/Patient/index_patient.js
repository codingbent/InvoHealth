const express = require("express");
const router = express.Router();

// ── Public / auth routes ───────────────────────────────────────────────────
router.use("/", require("./patient_send_otp"));
router.use("/", require("./patient_verify_otp"));


// ── Authenticated patient routes ───────────────────────────────────────────
router.use("/", require("./get_doctors"));
router.use("/", require("./visit"));
router.use("/", require("./get_patient_details"));
router.use("/", require("./edit_details"));
router.use("/", require("./download_invoice"));
router.use("/", require("./send_invoice"));
router.use("/", require("./doctor_details"));
router.use("/", require("./select_profile"));
router.use("/", require("./record"));

module.exports = router;
