const express = require("express");
const router = express.Router();
const { registerClient, registerPartner, login, me, updateProfile } = require("../controllers/authController");
const authenticate = require("../middleware/auth");
const { handleImagesUpload } = require("../middleware/upload");

router.post("/register/client", registerClient);
// "images" = champ du formulaire (FormData) contenant jusqu'a 10 photos de l'etablissement
router.post("/register/partner", handleImagesUpload("images", 10), registerPartner);
router.post("/login", login);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateProfile);

module.exports = router;
