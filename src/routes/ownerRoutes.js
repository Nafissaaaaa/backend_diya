const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const {
  createEstablishment,
  updateEstablishment,
  myEstablishments,
} = require("../controllers/establishmentController");

const { createRoom, updateRoom, deleteRoom } = require("../controllers/roomController");

const {
  ownerReservations,
  acceptReservation,
  rejectReservation,
} = require("../controllers/reservationController");

// Toutes les routes de ce fichier necessitent le role "owner"
router.use(authenticate, authorize("owner", "admin"));

// Etablissements
router.get("/establishments/me", myEstablishments);
router.post("/establishments", createEstablishment);
router.put("/establishments/:id", updateEstablishment);

// Chambres / places
router.post("/establishments/:establishmentId/rooms", createRoom);
router.put("/rooms/:id", updateRoom);
router.delete("/rooms/:id", deleteRoom);

// Reservations recues
router.get("/reservations", ownerReservations);
router.patch("/reservations/:id/accept", acceptReservation); // pending -> accepted
router.patch("/reservations/:id/reject", rejectReservation); // pending -> rejected

module.exports = router;
