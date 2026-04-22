const express = require("express");
const router = express.Router();

router.use("/", require("./add_method"));

module.exports = router;
