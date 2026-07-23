const express = require("express");
const router = express.Router();
const { listEstablishments, getEstablishment } = require("../controllers/establishmentController");

// Public - visible par tous
router.get("/", listEstablishments);
router.get("/:id", getEstablishment);

module.exports = router;
