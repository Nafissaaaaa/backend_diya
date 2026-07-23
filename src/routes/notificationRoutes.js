const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const { myNotifications, markAsRead } = require("../controllers/notificationController");

router.use(authenticate);

router.get("/me", myNotifications);
router.patch("/:id/read", markAsRead);

module.exports = router;
