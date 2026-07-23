const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nom: { type: DataTypes.STRING, allowNull: false },
    prenom: { type: DataTypes.STRING, allowNull: false },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: { isEmail: true },
    },
    telephone: { type: DataTypes.STRING, allowNull: true, unique: true },
    motDePasse: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("client", "owner", "admin"),
      defaultValue: "client",
    },
    statut: {
      type: DataTypes.ENUM("actif", "bloque"),
      defaultValue: "actif",
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);
module.exports = User;
