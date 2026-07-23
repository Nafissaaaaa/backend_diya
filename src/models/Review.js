const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    note: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    commentaire: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "reviews",
    timestamps: true,
  }
);

module.exports = Review;
