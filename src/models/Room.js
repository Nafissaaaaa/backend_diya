const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Room = sequelize.define(
  "Room",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nomType: { type: DataTypes.STRING, allowNull: false }, // ex: "Chambre double", "Place dortoir"
    prixNuit: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    capacite: { type: DataTypes.INTEGER, defaultValue: 1 },
    nbDisponible: { type: DataTypes.INTEGER, defaultValue: 1 },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    actif: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "rooms",
    timestamps: true,
  }
);

module.exports = Room;
