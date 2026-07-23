const { Sequelize } = require("sequelize");
require("dotenv").config();

// La plupart des bases PostgreSQL hebergees (Render, Neon, Supabase...) exigent
// une connexion SSL. On l'active si DB_SSL=true est defini, sans casser
// les connexions locales ou DB_SSL est absent.
const useSSL = process.env.DB_SSL === "true";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
    dialectOptions: useSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  }
);

module.exports = sequelize;
