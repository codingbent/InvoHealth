const express = require("express");
const router = express.Router();

router.use("/", require("./add_patient"));
router.use("/", require("./update_patient"));
router.use("/", require("./delete_patient"));
router.use("/", require("./patient_details"));
router.use("/", require("./search_patient"));
router.use("/", require("./patient_record"));

module.exports = router;