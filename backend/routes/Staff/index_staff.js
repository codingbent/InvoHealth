const express = require("express");
const router = express.Router();

router.use("/", require("./login_staff"));
router.use("/", require("./set_password"));
router.use("/", require("./change_password"));
router.use("/",require("./staff_profile"))

module.exports = router;