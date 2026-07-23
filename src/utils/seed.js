// Cree un compte admin par defaut. Executer avec: npm run db:seed
const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");
const { User } = require("../models");
require("dotenv").config();

async function seed() {
  await sequelize.sync();

  const existingAdmin = await User.findOne({ where: { role: "admin" } });
  if (existingAdmin) {
    console.log("Un compte admin existe deja :", existingAdmin.email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash("Admin@2026", 10);

  const admin = await User.create({
    nom: "Diyafa",
    prenom: "Admin",
    email: "admin@diyafa.dz",
    motDePasse: hashed,
    role: "admin",
  });

  console.log("Compte admin cree :");
  console.log("  email :", admin.email);
  console.log("  mot de passe : Admin@2026");
  console.log("  (a changer immediatement apres la premiere connexion)");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
