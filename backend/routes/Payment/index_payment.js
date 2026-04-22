const express = require("express");
const router = express.Router();

router.use("/", require("./create-order"));
router.use("/", require("./verify-payment"));

router.use("/", require("./payment_history"));

module.exports = router;
