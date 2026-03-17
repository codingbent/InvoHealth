const express = require("express");
const router = express.Router();

router.use("/",require("./create-order"));
router.use("/",require("./verify-payment"));

module.exports = router;