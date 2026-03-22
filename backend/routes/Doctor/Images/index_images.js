const express = require("express");
const router = express.Router();

router.use("/upload", require("./upload_routes"));

module.exports = router;