const { Establishment, Room, Review, User, Reservation, sequelize } = require("../models");
const { Op } = require("sequelize");

// GET /api/establishments  (public - uniquement les etablissements valides)
async function listEstablishments(req, res) {
  try {
    const { ville, type, prixMin, prixMax } = req.query;

    const where = { statutValidation: "valide", actif: true };
    if (ville) where.ville = ville;
    if (type) where.type = type;

    const establishments = await Establishment.findAll({
      where,
      include: [{ model: Room, as: "rooms" }],
      order: [["createdAt", "DESC"]],
    });

    return res.json(establishments);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/establishments/:id (public)
async function getEstablishment(req, res) {
  try {
    const establishment = await Establishment.findOne({
      where: { id: req.params.id, statutValidation: "valide" },
      include: [
        { model: Room, as: "rooms" },
        { model: Review, as: "reviews" },
      ],
    });

    if (!establishment) {
      return res.status(404).json({ message: "Etablissement introuvable." });
    }

    return res.json(establishment);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// POST /api/owner/establishments (owner uniquement) -> cree en statut "en_attente"
async function createEstablishment(req, res) {
  try {
    const { nom, type, wilaya, ville, adresse, latitude, longitude, description, images } = req.body;

    if (!nom || !type || !wilaya || !ville || !adresse) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    const establishment = await Establishment.create({
      ownerId: req.user.id,
      nom,
      type,
      wilaya,
      ville,
      adresse,
      latitude,
      longitude,
      description,
      images: images || [],
      statutValidation: "en_attente",
    });

    return res.status(201).json({
      message: "Etablissement cree. En attente de validation par l'administrateur.",
      establishment,
    });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PUT /api/owner/establishments/:id (owner - doit etre le proprietaire)
async function updateEstablishment(req, res) {
  try {
    const establishment = await Establishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json({ message: "Etablissement introuvable." });
    }
    if (establishment.ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Acces refuse." });
    }

    const fields = ["nom", "wilaya", "ville", "adresse", "latitude", "longitude", "description", "images"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) establishment[f] = req.body[f];
    });

    await establishment.save();
    return res.json({ message: "Etablissement mis a jour.", establishment });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/owner/establishments/me (owner - ses propres etablissements)
async function myEstablishments(req, res) {
  try {
    const establishments = await Establishment.findAll({
      where: { ownerId: req.user.id },
      include: [{ model: Room, as: "rooms" }],
    });
    return res.json(establishments);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// ---------- ADMIN ----------

// GET /api/admin/establishments/pending
async function listPending(req, res) {
  try {
    const pending = await Establishment.findAll({
      where: { statutValidation: "en_attente" },
      include: [{ model: User, as: "owner", attributes: ["id", "nom", "prenom", "email"] }],
      order: [["createdAt", "ASC"]],
    });
    return res.json(pending);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PATCH /api/admin/establishments/:id/validate  body: { decision: "valide" | "refuse" }
async function validateEstablishment(req, res) {
  try {
    const { decision } = req.body; // "valide" ou "refuse"
    if (!["valide", "refuse"].includes(decision)) {
      return res.status(400).json({ message: "Decision invalide." });
    }

    const establishment = await Establishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json({ message: "Etablissement introuvable." });
    }

    establishment.statutValidation = decision;
    await establishment.save();

    // TODO: creer une notification pour le owner (voir notificationController)

    return res.json({ message: `Etablissement ${decision}.`, establishment });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PATCH /api/admin/establishments/:id/best-image  body: { image }
// L'admin choisit, parmi les photos envoyees par le partenaire, celle qui
// devient la photo de couverture affichee partout (carte, page detail...).
async function setBestImage(req, res) {
  try {
    const { image } = req.body;
    const establishment = await Establishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json({ message: "Etablissement introuvable." });
    }

    const images = establishment.images || [];
    if (!image || !images.includes(image)) {
      return res.status(400).json({ message: "Cette photo ne fait pas partie des photos envoyees par ce partenaire." });
    }

    establishment.imageVedette = image;
    await establishment.save();

    return res.json({ message: "Photo principale mise a jour.", establishment });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/admin/establishments/valides
async function listValidated(req, res) {
  try {
    const establishments = await Establishment.findAll({
      where: { statutValidation: "valide" },
      include: [{ model: User, as: "owner", attributes: ["id", "nom", "prenom", "email"] }],
      order: [["createdAt", "DESC"]],
    });
    return res.json(establishments);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// DELETE /api/admin/establishments/:id
// Supprime l'etablissement et tout ce qui en depend (chambres, reservations,
// avis). Ne supprime PAS le compte du proprietaire.
async function deleteEstablishment(req, res) {
  const t = await sequelize.transaction();
  try {
    const establishment = await Establishment.findByPk(req.params.id, { transaction: t });
    if (!establishment) {
      await t.rollback();
      return res.status(404).json({ message: "Etablissement introuvable." });
    }

    await Review.destroy({ where: { establishmentId: establishment.id }, transaction: t });
    await Reservation.destroy({ where: { establishmentId: establishment.id }, transaction: t });
    await Room.destroy({ where: { establishmentId: establishment.id }, transaction: t });
    await establishment.destroy({ transaction: t });

    await t.commit();
    return res.json({ message: "Etablissement supprime." });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

module.exports = {
  listEstablishments,
  getEstablishment,
  createEstablishment,
  updateEstablishment,
  myEstablishments,
  listPending,
  validateEstablishment,
  setBestImage,
  listValidated,
  deleteEstablishment,
};
