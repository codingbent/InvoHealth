const express = require("express");
const router = express.Router();

router.use("/", require("./add_service"));
router.use("/", require("./update_service"));
router.use("/", require("./fetchall_services"));

module.exports = router;