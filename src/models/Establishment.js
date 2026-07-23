const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Establishment = sequelize.define(
  "Establishment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nom: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM("hotel", "mraqed"),
      allowNull: false,
    },
    wilaya: { type: DataTypes.STRING, allowNull: false },
    ville: { type: DataTypes.STRING, allowNull: false },
    adresse: { type: DataTypes.STRING, allowNull: false },
    latitude: { type: DataTypes.FLOAT, allowNull: true },
    longitude: { type: DataTypes.FLOAT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    // Photo choisie par l'admin comme photo principale de l'etablissement
    // (une des URLs presentes dans "images"). Affichee comme photo de couverture
    // partout ou l'etablissement est liste une fois valide.
    imageVedette: { type: DataTypes.STRING, allowNull: true },
    statutValidation: {
      type: DataTypes.ENUM("en_attente", "valide", "refuse"),
      defaultValue: "en_attente",
    },
    actif: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "establishments",
    timestamps: true,
  }
);

module.exports = Establishment;
