const { User, Establishment, Reservation, Review } = require("../models");
const { Op, fn, col } = require("sequelize");

// GET /api/admin/users
async function listUsers(req, res) {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role;

    const users = await User.findAll({
      where,
      attributes: { exclude: ["motDePasse"] },
      order: [["createdAt", "DESC"]],
    });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PATCH /api/admin/users/:id/status  body: { statut: "actif" | "bloque" }
async function updateUserStatus(req, res) {
  try {
    const { statut } = req.body;
    if (!["actif", "bloque"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide." });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    user.statut = statut;
    await user.save();

    return res.json({ message: `Utilisateur ${statut}.`, user: { id: user.id, statut: user.statut } });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/admin/stats
async function getStats(req, res) {
  try {
    const [
      totalUsers,
      totalClients,
      totalOwners,
      totalEstablishments,
      pendingEstablishments,
      totalReservations,
      pendingReservations,
      acceptedReservations,
      rejectedReservations,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { role: "client" } }),
      User.count({ where: { role: "owner" } }),
      Establishment.count({ where: { statutValidation: "valide" } }),
      Establishment.count({ where: { statutValidation: "en_attente" } }),
      Reservation.count(),
      Reservation.count({ where: { statut: "pending" } }),
      Reservation.count({ where: { statut: "accepted" } }),
      Reservation.count({ where: { statut: "rejected" } }),
    ]);

    const revenue = await Reservation.sum("prixTotal", { where: { statut: "accepted" } });

    return res.json({
      utilisateurs: { total: totalUsers, clients: totalClients, partenaires: totalOwners },
      etablissements: { valides: totalEstablishments, enAttente: pendingEstablishments },
      reservations: {
        total: totalReservations,
        enAttente: pendingReservations,
        confirmees: acceptedReservations,
        refusees: rejectedReservations,
      },
      revenuEstime: revenue || 0,
    });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/admin/dashboard
// Alimente le tableau de bord admin : cartes chiffrees, tendance des
// reservations sur l'annee, repartition hotels/dortoirs, activite recente.
async function getDashboard(req, res) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      reservationsActives,
      etablissementsTotal,
      hotelsValides,
      dortoirsValides,
      nouveauxInscrits,
      revenuMoisRaw,
      reservationsAnnee,
      reservationsRecentes,
      demandesInscription,
      avisRecents,
    ] = await Promise.all([
      Reservation.count({ where: { statut: "accepted" } }),
      Establishment.count(),
      Establishment.count({ where: { type: "hotel", statutValidation: "valide" } }),
      Establishment.count({ where: { type: "mraqed", statutValidation: "valide" } }),
      User.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),
      Reservation.sum("prixTotal", {
        where: { statut: "accepted", createdAt: { [Op.gte]: startOfMonth } },
      }),
      Reservation.findAll({
        where: { createdAt: { [Op.gte]: startOfYear } },
        attributes: ["createdAt"],
      }),
      Reservation.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]],
        include: [
          { model: User, as: "client", attributes: ["nom", "prenom"] },
          { model: Establishment, as: "establishment", attributes: ["nom"] },
        ],
      }),
      Establishment.findAll({
        where: { statutValidation: "en_attente" },
        limit: 5,
        order: [["createdAt", "ASC"]],
        include: [{ model: User, as: "owner", attributes: ["nom", "prenom"] }],
      }),
      Review.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]],
        include: [
          { model: User, as: "client", attributes: ["nom", "prenom"] },
          { model: Establishment, as: "establishment", attributes: ["nom"] },
        ],
      }),
    ]);

    const MOIS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
    const totauxParMois = MOIS.map(() => 0);
    reservationsAnnee.forEach((r) => {
      totauxParMois[new Date(r.createdAt).getMonth()] += 1;
    });

    return res.json({
      cards: {
        reservationsActives,
        etablissementsTotal,
        revenuMois: Number(revenuMoisRaw) || 0,
        nouveauxInscrits,
      },
      tendances: MOIS.map((mois, i) => ({ mois, total: totauxParMois[i] })),
      repartitionParType: { hotel: hotelsValides, mraqed: dortoirsValides },
      reservationsRecentes: reservationsRecentes.map((r) => ({
        id: r.id,
        etablissement: r.establishment?.nom || "—",
        client: r.client ? `${r.client.prenom} ${r.client.nom}` : "—",
        dateDebut: r.dateDebut,
        dateFin: r.dateFin,
        statut: r.statut,
      })),
      demandesInscription: demandesInscription.map((e) => ({
        id: e.id,
        nom: e.nom,
        type: e.type,
        ville: e.ville,
        proprietaire: e.owner ? `${e.owner.prenom} ${e.owner.nom}` : "—",
      })),
      avisRecents: avisRecents.map((a) => ({
        id: a.id,
        client: a.client ? `${a.client.prenom} ${a.client.nom}` : "—",
        etablissement: a.establishment?.nom || "—",
        note: a.note,
        commentaire: a.commentaire,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

module.exports = { listUsers, updateUserStatus, getStats, getDashboard };
