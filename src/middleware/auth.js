const { verifyToken } = require("../utils/jwt");
const { User } = require("../models");

// Verifie que l'utilisateur est connecte (token JWT valide)
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }
    if (user.statut === "bloque") {
      return res.status(403).json({ message: "Compte bloque. Contactez le support." });
    }

    req.user = user; // disponible dans toutes les routes suivantes
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expire." });
  }
}

module.exports = authenticate;
