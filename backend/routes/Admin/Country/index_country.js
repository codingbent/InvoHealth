const express = require("express");
const router = express.Router();

router.use("/",require("./get_country"))
router.use("/",require("./update_country"))
router.use("/",require("./add_country"))
router.use("/",require("./update_multipier"))

module.exports = router;