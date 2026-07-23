const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  createReservation,
  myReservations,
  cancelReservation,
  createGuestReservation,
} = require("../controllers/reservationController");

router.post("/guest", createGuestReservation);
router.use(authenticate, authorize("client"));

router.post("/", createReservation);
router.get("/me", myReservations);
router.patch("/:id/cancel", cancelReservation);

module.exports = router;
