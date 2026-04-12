const express = require("express");
const router = express.Router();

router.use("/",require("./fetchall_doctors"))
router.use("/",require("./login_admin"))
router.use("/",require("./update_subscription"))
router.use("/",require("./Pricing/index_pricing"))
router.use("/",require("./get_doctor_phone"))

module.exports = router;