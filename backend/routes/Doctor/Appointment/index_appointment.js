const express = require("express");
const router = express.Router();

router.use("/", require("./add_appointment"));
router.use("/", require("./delete_appointment"));
router.use("/", require("./edit_appointment"));
router.use("/", require("./fetchall_appointments"));
router.use("/", require("./booked_slots"));
router.use("/", require("./get_usage"));
router.use("/", require("./email_export"));

module.exports = router;
