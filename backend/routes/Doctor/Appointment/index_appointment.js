const express = require("express");
const router = express.Router();

router.use("/", require("./add_appointment"));
router.use("/", require("./delete_appointment"));
router.use("/", require("./edit_appointment"));
router.use("/", require("./export_appointments"));
router.use("/", require("./fetchall_appointments"));
router.use("/", require("./update_appointment"));

module.exports = router;