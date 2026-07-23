const sequelize = require("../config/db");
const User = require("./User");
const Establishment = require("./Establishment");
const Room = require("./Room");
const Reservation = require("./Reservation");
const Notification = require("./Notification");
const Review = require("./Review");

// ---------- Un owner (User role=owner) possede plusieurs etablissements ----------
User.hasMany(Establishment, { foreignKey: "ownerId", as: "establishments" });
Establishment.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

// ---------- Un etablissement a plusieurs chambres/places ----------
Establishment.hasMany(Room, { foreignKey: "establishmentId", as: "rooms" });
Room.belongsTo(Establishment, { foreignKey: "establishmentId", as: "establishment" });

// ---------- Reservation : client + etablissement + chambre ----------
User.hasMany(Reservation, { foreignKey: "clientId", as: "reservations" });
Reservation.belongsTo(User, { foreignKey: "clientId", as: "client" });

Establishment.hasMany(Reservation, { foreignKey: "establishmentId", as: "reservations" });
Reservation.belongsTo(Establishment, { foreignKey: "establishmentId", as: "establishment" });

Room.hasMany(Reservation, { foreignKey: "roomId", as: "reservations" });
Reservation.belongsTo(Room, { foreignKey: "roomId", as: "room" });

// ---------- Notifications appartiennent a un utilisateur ----------
User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

// ---------- Reviews : client + etablissement ----------
User.hasMany(Review, { foreignKey: "clientId", as: "reviews" });
Review.belongsTo(User, { foreignKey: "clientId", as: "client" });

Establishment.hasMany(Review, { foreignKey: "establishmentId", as: "reviews" });
Review.belongsTo(Establishment, { foreignKey: "establishmentId", as: "establishment" });

module.exports = {
  sequelize,
  User,
  Establishment,
  Room,
  Reservation,
  Notification,
  Review,
};
