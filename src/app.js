const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const establishmentRoutes = require("./routes/establishmentRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// CLIENT_URL peut contenir une ou plusieurs origines separees par une virgule.
// Si non definie (ou "*"), on autorise toutes les origines (pratique en phase de mise en route).
const allowedOrigins = (process.env.CLIENT_URL || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes("*") || !origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origine non autorisee par CORS."));
    },
  })
);
app.use(express.json());

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "diyafa-backend" });
});

// Routes principales
app.use("/api/auth", authRoutes);
app.use("/api/establishments", establishmentRoutes); // public
app.use("/api/reservations", reservationRoutes); // client
app.use("/api/owner", ownerRoutes); // hotel / mraqed
app.use("/api/admin", adminRoutes); // admin
app.use("/api/notifications", notificationRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable." });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur interne du serveur." });
});

module.exports = app;
