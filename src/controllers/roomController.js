const { Room, Establishment } = require("../models");

// Verifie que l'utilisateur connecte possede bien l'etablissement
async function assertOwnership(establishmentId, user) {
  const establishment = await Establishment.findByPk(establishmentId);
  if (!establishment) return { error: "Etablissement introuvable.", status: 404 };
  if (establishment.ownerId !== user.id && user.role !== "admin") {
    return { error: "Acces refuse.", status: 403 };
  }
  return { establishment };
}

// POST /api/owner/establishments/:establishmentId/rooms
async function createRoom(req, res) {
  try {
    const { establishmentId } = req.params;
    const check = await assertOwnership(establishmentId, req.user);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const { nomType, prixNuit, capacite, nbDisponible, images } = req.body;
    if (!nomType || !prixNuit) {
      return res.status(400).json({ message: "nomType et prixNuit sont obligatoires." });
    }

    const room = await Room.create({
      establishmentId,
      nomType,
      prixNuit,
      capacite: capacite || 1,
      nbDisponible: nbDisponible || 1,
      images: images || [],
    });

    return res.status(201).json({ message: "Chambre/place ajoutee.", room });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PUT /api/owner/rooms/:id
async function updateRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: "Chambre introuvable." });

    const check = await assertOwnership(room.establishmentId, req.user);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const fields = ["nomType", "prixNuit", "capacite", "nbDisponible", "images", "actif"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) room[f] = req.body[f];
    });

    await room.save();
    return res.json({ message: "Chambre mise a jour.", room });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// DELETE /api/owner/rooms/:id
async function deleteRoom(req, res) {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: "Chambre introuvable." });

    const check = await assertOwnership(room.establishmentId, req.user);
    if (check.error) return res.status(check.status).json({ message: check.error });

    await room.destroy();
    return res.json({ message: "Chambre supprimee." });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

module.exports = { createRoom, updateRoom, deleteRoom };
