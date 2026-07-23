const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "reservation_pending", // حجز جديد قيد الانتظار (يوصل لصاحب المؤسسة)
        "reservation_accepted", // تم قبول الحجز (يوصل للزبون) + Admin 
        "reservation_rejected", // تم رفض الحجز (يوصل للزبون)
        "establishment_validated", // الأدمن وافق على المؤسسة (يوصل لصاحبها) 
        "establishment_refused", // الأدمن رفض المؤسسة (يوصل لصاحبها)
        "general"
      ),
      defaultValue: "general",
    },
    lu: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "notifications",
    timestamps: true,
  }
);

module.exports = Notification;
