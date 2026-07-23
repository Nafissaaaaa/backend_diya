const app = require("./app");
const sequelize = require("./config/db");
require("./models"); // charge les modeles et associations
require("dotenv").config();

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Connexion a la base de donnees reussie.");

    // En developpement uniquement : synchronise les tables automatiquement.
    // En production, utiliser des migrations plutot que sync({ alter: true }).
    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });

    app.listen(PORT, () => {
      console.log(`Serveur Diyafa demarre sur le port ${PORT}`);
    });
  } catch (err) {
    console.error("Impossible de demarrer le serveur :", err);
    process.exit(1);
  }
}

start();
