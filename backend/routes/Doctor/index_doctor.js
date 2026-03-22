const express = require("express");
const router = express.Router();

router.use("/", require("./create_doctor"));
router.use("/", require("./login_doctor"));
router.use("/", require("./update_profile"));
router.use("/", require("./dashboard_analytics"));
router.use("/", require("./get_doc"));
router.use("/",require("./change_password"));
router.use("/",require("./reset_password"));
router.use("/",require("./subscription"));
router.use("/",require("./payment_history"));

router.use("/appointment", require("./Appointment/index_appointment"));
router.use("/patient", require("./Patient/index_patient"));
router.use("/staff", require("./Staff/index_staff"));
router.use("/services", require("./Services/index_services"));
router.use("/timing", require("./Timing/index_timing"));
router.use("/image",require("./Images/index_images"))

module.exports = router;