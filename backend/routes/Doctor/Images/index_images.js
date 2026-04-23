const express = require("express");
const router = express.Router();

router.use("/", require("./upload_routes"));

module.exports = router;
