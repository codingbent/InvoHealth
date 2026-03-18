const express = require("express");
const router = express.Router();

router.use("/", require("./set_availability"));
router.use("/", require("./get_availability"));
router.use("/", require("./update_availability"));

module.exports = router;