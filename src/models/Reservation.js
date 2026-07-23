const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Reservation = sequelize.define(
  "Reservation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    dateDebut: { type: DataTypes.DATEONLY, allowNull: false },
    dateFin: { type: DataTypes.DATEONLY, allowNull: false },
    nbPersonnes: { type: DataTypes.INTEGER, defaultValue: 1 },
    prixTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    statut: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "rejected",
        "cancelled",
        "completed"
      ),
      defaultValue: "pending",
    },
    motifRefus: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "reservations",
    timestamps: true,
  }
);

module.exports = Reservation;
