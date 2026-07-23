const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const {
  listPending,
  validateEstablishment,
  setBestImage,
  listValidated,
  deleteEstablishment,
} = require("../controllers/establishmentController");

const { adminReservations } = require("../controllers/reservationController");
const { listUsers, updateUserStatus, getStats, getDashboard } = require("../controllers/adminController");

// Toutes les routes de ce fichier necessitent le role "admin"
router.use(authenticate, authorize("admin"));

// Etablissements en attente de validation
router.get("/establishments/pending", listPending);
router.patch("/establishments/:id/validate", validateEstablishment);
// L'admin choisit la meilleure photo parmi celles envoyees par le partenaire
router.patch("/establishments/:id/best-image", setBestImage);

// Etablissements deja valides, avec bouton supprimer cote admin
router.get("/establishments/valides", listValidated);
router.delete("/establishments/:id", deleteEstablishment);

// Reservations - le dashboard admin filtre avec ?statut=accepted
router.get("/reservations", adminReservations);

// Utilisateurs
router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);

// Statistiques
router.get("/stats", getStats);
router.get("/dashboard", getDashboard);

module.exports = router;
