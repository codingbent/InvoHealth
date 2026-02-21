const express = require("express");
const router = express.Router();

router.use("/", require("./add_staff"));
router.use("/", require("./edit_staff"));
router.use("/", require("./delete_staff"));
router.use("/", require("./fetch_staff"));

module.exports = router;