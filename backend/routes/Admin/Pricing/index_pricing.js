const express = require("express");
const router = express.Router();

router.use("/",require("./get_pricing"))
router.use("/",require("./update"))

module.exports = router;