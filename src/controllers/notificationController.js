const { Notification } = require("../models");

// GET /api/notifications/me
async function myNotifications(req, res) {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res) {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ message: "Notification introuvable." });
    }
    notification.lu = true;
    await notification.save();
    return res.json({ message: "Notification marquee comme lue." });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

module.exports = { myNotifications, markAsRead };
