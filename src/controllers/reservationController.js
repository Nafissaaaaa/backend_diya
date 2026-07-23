const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Reservation, Room, Establishment, User, Notification } = require("../models");
const { generateToken } = require("../utils/jwt");

// Petit helper pour creer une notification
async function notify(userId, message, type) {
  await Notification.create({ userId, message, type });
}

// POST /api/reservations (client)
// -> Toute nouvelle reservation nait avec le statut "pending"
async function createReservation(req, res) {
  try {
    const { establishmentId, roomId, dateDebut, dateFin, nbPersonnes } = req.body;

    if (!establishmentId || !roomId || !dateDebut || !dateFin) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    const room = await Room.findByPk(roomId);
    if (!room || !room.actif) {
      return res.status(404).json({ message: "Chambre/place indisponible." });
    }

    const establishment = await Establishment.findByPk(establishmentId);
    if (!establishment || establishment.statutValidation !== "valide") {
      return res.status(404).json({ message: "Etablissement indisponible." });
    }

    // Calcul simple du prix total (nb de nuits x prix/nuit)
    const nbNuits = Math.max(
      1,
      Math.ceil((new Date(dateFin) - new Date(dateDebut)) / (1000 * 60 * 60 * 24))
    );
    const prixTotal = nbNuits * parseFloat(room.prixNuit);

    const reservation = await Reservation.create({
      clientId: req.user.id,
      establishmentId,
      roomId,
      dateDebut,
      dateFin,
      nbPersonnes: nbPersonnes || 1,
      prixTotal,
      statut: "pending", // <-- toujours en attente au depart
    });

    // Notifier le proprietaire de l'etablissement
    await notify(
      establishment.ownerId,
      `Nouvelle demande de reservation pour ${establishment.nom} (${dateDebut} - ${dateFin}).`,
      "reservation_pending"
    );

    return res.status(201).json({
      message: "Demande de reservation envoyee. En attente de confirmation.",
      reservation,
    });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/reservations/me (client - ses propres reservations)
async function myReservations(req, res) {
  try {
    const reservations = await Reservation.findAll({
      where: { clientId: req.user.id },
      include: [
        { model: Establishment, as: "establishment", attributes: ["id", "nom", "type", "ville"] },
        { model: Room, as: "room", attributes: ["id", "nomType"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.json(reservations);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PATCH /api/reservations/:id/cancel (client annule sa propre demande, si encore pending)
async function cancelReservation(req, res) {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation introuvable." });
    if (reservation.clientId !== req.user.id) {
      return res.status(403).json({ message: "Acces refuse." });
    }
    if (!["pending", "accepted"].includes(reservation.statut)) {
      return res.status(400).json({ message: "Cette reservation ne peut plus etre annulee." });
    }

    reservation.statut = "cancelled";
    await reservation.save();

    return res.json({ message: "Reservation annulee.", reservation });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// ---------- OWNER (hotel / mraqed) ----------

// GET /api/owner/reservations (les reservations concernant les etablissements du owner)
async function ownerReservations(req, res) {
  try {
    const { statut } = req.query; // filtre optionnel: pending / accepted / rejected ...

    const establishments = await Establishment.findAll({
      where: { ownerId: req.user.id },
      attributes: ["id"],
    });
    const establishmentIds = establishments.map((e) => e.id);

    const where = { establishmentId: establishmentIds };
    if (statut) where.statut = statut;

    const reservations = await Reservation.findAll({
      where,
      include: [
        { model: User, as: "client", attributes: ["id", "nom", "prenom", "telephone"] },
        { model: Establishment, as: "establishment", attributes: ["id", "nom"] },
        { model: Room, as: "room", attributes: ["id", "nomType"] },
      ],
      order: [
        // les demandes en attente remontent en premier
        ["statut", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    return res.json(reservations);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// Verifie que la reservation appartient bien a un etablissement du owner connecte
async function assertOwnerOfReservation(reservation, user) {
  if (user.role === "admin") return true;
  const establishment = await Establishment.findByPk(reservation.establishmentId);
  return establishment && establishment.ownerId === user.id;
}

// PATCH /api/owner/reservations/:id/accept
// -> C'est ICI que le statut passe de "pending" a "accepted"
// -> Une fois accepted, la reservation devient visible dans le dashboard admin
async function acceptReservation(req, res) {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation introuvable." });

    const allowed = await assertOwnerOfReservation(reservation, req.user);
    if (!allowed) return res.status(403).json({ message: "Acces refuse." });

    if (reservation.statut !== "pending") {
      return res.status(400).json({ message: "Seule une reservation en attente peut etre acceptee." });
    }

    reservation.statut = "accepted";
    await reservation.save();

    await notify(
      reservation.clientId,
      "Votre reservation a ete confirmee par l'etablissement.",
      "reservation_accepted"
    );

    return res.json({ message: "Reservation acceptee.", reservation });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PATCH /api/owner/reservations/:id/reject
async function rejectReservation(req, res) {
  try {
    const { motif } = req.body;
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation introuvable." });

    const allowed = await assertOwnerOfReservation(reservation, req.user);
    if (!allowed) return res.status(403).json({ message: "Acces refuse." });

    if (reservation.statut !== "pending") {
      return res.status(400).json({ message: "Seule une reservation en attente peut etre refusee." });
    }

    reservation.statut = "rejected";
    reservation.motifRefus = motif || null;
    await reservation.save();

    await notify(
      reservation.clientId,
      "Votre demande de reservation a ete refusee par l'etablissement.",
      "reservation_rejected"
    );

    return res.json({ message: "Reservation refusee.", reservation });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// ---------- ADMIN ----------

// GET /api/admin/reservations?statut=accepted
// -> Le dashboard admin utilise ce endpoint avec statut=accepted
//    pour n'afficher que les reservations confirmees par les etablissements
async function adminReservations(req, res) {
  try {
    const { statut } = req.query;
    const where = {};
    if (statut) where.statut = statut;

    const reservations = await Reservation.findAll({
      where,
      include: [
        { model: User, as: "client", attributes: ["id", "nom", "prenom", "email"] },
        { model: Establishment, as: "establishment", attributes: ["id", "nom", "type", "ville"] },
        { model: Room, as: "room", attributes: ["id", "nomType"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json(reservations);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}


// POST /api/reservations/guest
// Permet de reserver sans compte prealable : cree un compte client automatiquement
// si l'email est inconnu (avec un mot de passe temporaire), puis cree la reservation.
async function createGuestReservation(req, res) {
  try {
    const { nom, prenom, email, telephone, establishmentId, roomId, dateDebut, dateFin, nbPersonnes } = req.body;

    if (!nom || !prenom || !email || !establishmentId || !roomId || !dateDebut || !dateFin) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    const room = await Room.findByPk(roomId);
    if (!room || !room.actif) {
      return res.status(404).json({ message: "Chambre/place indisponible." });
    }

    const establishment = await Establishment.findByPk(establishmentId);
    if (!establishment || establishment.statutValidation !== "valide") {
      return res.status(404).json({ message: "Etablissement indisponible." });
    }

    let user = await User.findOne({ where: { email } });
    let compteCree = false;
    let motDePasseTemporaire = null;

    if (!user) {
      motDePasseTemporaire = crypto.randomBytes(4).toString("hex");
      const hashed = await bcrypt.hash(motDePasseTemporaire, 10);
      user = await User.create({ nom, prenom, email, telephone, motDePasse: hashed, role: "client" });
      compteCree = true;
    }

    const nbNuits = Math.max(
      1,
      Math.ceil((new Date(dateFin) - new Date(dateDebut)) / (1000 * 60 * 60 * 24))
    );
    const prixTotal = nbNuits * parseFloat(room.prixNuit);

    const reservation = await Reservation.create({
      clientId: user.id,
      establishmentId,
      roomId,
      dateDebut,
      dateFin,
      nbPersonnes: nbPersonnes || 1,
      prixTotal,
      statut: "pending",
    });

    await notify(
      establishment.ownerId,
      `Nouvelle demande de reservation pour ${establishment.nom} (${dateDebut} - ${dateFin}).`,
      "reservation_pending"
    );

    const token = generateToken(user);

    return res.status(201).json({
      message: compteCree
        ? "Reservation envoyee. Un compte a ete cree pour vous."
        : "Demande de reservation envoyee. En attente de confirmation.",
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
      reservation,
      compteCree,
      // Envoye uniquement a la creation du compte, pour que le frontend puisse
      // l'afficher une seule fois au client (a lui de le changer ensuite dans son profil).
      motDePasseTemporaire,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}
module.exports = {
  createReservation,
  myReservations,
  cancelReservation,
  ownerReservations,
  acceptReservation,
  rejectReservation,
  adminReservations,
  createGuestReservation,
};
