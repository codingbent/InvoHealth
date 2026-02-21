const express = require("express");
const router = express.Router();

router.use("/", require("./create_doctor"));
router.use("/", require("./login_doctor"));
router.use("/", require("./update_profile"));
router.use("/", require("./dashboard_analytics"));
router.use("/", require("./theme_doctor"));
router.use("/", require("./get_doc"));
router.use("/",require("./change_password"));
router.use("/",require("./reset_password"));

router.use("/appointment", require("./Appointment/index_appointment"));
router.use("/patient", require("./Patient/index_patient"));
router.use("/staff", require("./Staff/index_staff"));
router.use("/services", require("./Services/index_services"));

module.exports = router;