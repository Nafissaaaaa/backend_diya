const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User, Establishment, sequelize } = require("../models");
const { generateToken } = require("../utils/jwt");
const { verifyCaptcha } = require("../utils/verifyCaptcha");
const { uploadEstablishmentImages } = require("../utils/uploadImages");

// Regex simple et suffisante pour valider un format d'email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regle de robustesse du mot de passe :
// - au moins 8 caracteres
// - au moins une lettre
// - au moins un chiffre
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function validateCommonFields({ nom, prenom, email, motDePasse }) {
  if (!nom || !prenom || !email || !motDePasse) {
    return "Champs obligatoires manquants.";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Format d'email invalide.";
  }
  if (!PASSWORD_REGEX.test(motDePasse)) {
    return "Le mot de passe doit contenir au moins 8 caracteres, dont une lettre et un chiffre.";
  }
  return null;
}

// POST /api/auth/register/client
async function registerClient(req, res) {
  try {
    const { nom, prenom, email, telephone, motDePasse, captchaToken } = req.body;

    const isHuman = await verifyCaptcha(captchaToken);
    if (!isHuman) {
      return res.status(400).json({ message: "Verification anti-robot echouee." });
    }

    // Contrairement au partenaire, le client n'est pas oblige de fournir un
    // email (formulaire "Creer un compte" : nom/prenom/telephone/mot de passe
    // uniquement, + option Google en façade). Le telephone est en revanche
    // obligatoire puisque c'est l'identifiant de connexion si pas d'email.
    if (!nom || !prenom || !telephone || !motDePasse) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }
    if (!PASSWORD_REGEX.test(motDePasse)) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 8 caracteres, dont une lettre et un chiffre.",
      });
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Format d'email invalide." });
    }

    const existingPhone = await User.findOne({ where: { telephone } });
    if (existingPhone) {
      return res.status(409).json({ message: "Ce numero de telephone est deja utilise." });
    }

    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: "Cet email est deja utilise." });
      }
    }

    const hashed = await bcrypt.hash(motDePasse, 10);

    const user = await User.create({
      nom,
      prenom,
      email: email || null,
      telephone,
      motDePasse: hashed,
      role: "client",
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Inscription reussie.",
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// POST /api/auth/register/partner
// Cree le compte utilisateur (role owner) ET son etablissement (statut "en_attente")
// dans une seule transaction, a partir du formulaire d'inscription partenaire.
async function registerPartner(req, res) {
  try {
    const { nom, prenom, email, telephone, motDePasse, captchaToken } = req.body;

    // Quand le formulaire est envoye en multipart/form-data (cas des photos a
    // uploader), "etablissement" arrive sous forme de chaine JSON : on le parse.
    let etablissement = req.body.etablissement; // { type, wilaya, ville, adresse, nom }
    if (typeof etablissement === "string") {
      try {
        etablissement = JSON.parse(etablissement);
      } catch (e) {
        return res.status(400).json({ message: "Informations d'etablissement invalides." });
      }
    }

    const isHuman = await verifyCaptcha(captchaToken);
    if (!isHuman) {
      return res.status(400).json({ message: "Verification anti-robot echouee." });
    }

    const commonError = validateCommonFields({ nom, prenom, email, motDePasse });
    if (commonError) {
      return res.status(400).json({ message: commonError });
    }

    if (
      !etablissement ||
      !etablissement.type ||
      !etablissement.wilaya ||
      !etablissement.ville ||
      !etablissement.adresse ||
      !etablissement.nom
    ) {
      return res.status(400).json({ message: "Merci de renseigner toutes les informations de l'etablissement." });
    }

    if (!["hotel", "mraqed"].includes(etablissement.type)) {
      return res.status(400).json({ message: "Type d'etablissement invalide." });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Cet email est deja utilise." });
    }

    // req.files vient du middleware multer (route /register/partner, memoire) :
    // jusqu'a 10 photos, envoyees vers Cloudinary AVANT d'ouvrir la transaction
    // DB (pas la peine de garder une transaction ouverte pendant l'upload).
    let images = [];
    try {
      images = await uploadEstablishmentImages(req.files);
    } catch (uploadErr) {
      console.error("Erreur upload Cloudinary:", uploadErr);
      return res.status(502).json({ message: "Erreur lors de l'envoi des photos. Merci de reessayer." });
    }

    const t = await sequelize.transaction();
    try {
      const hashed = await bcrypt.hash(motDePasse, 10);

      const user = await User.create(
        {
          nom,
          prenom,
          email,
          telephone,
          motDePasse: hashed,
          role: "owner",
        },
        { transaction: t }
      );

      const newEstablishment = await Establishment.create(
        {
          ownerId: user.id,
          nom: etablissement.nom,
          type: etablissement.type,
          wilaya: etablissement.wilaya,
          ville: etablissement.ville,
          adresse: etablissement.adresse,
          images,
          statutValidation: "en_attente",
        },
        { transaction: t }
      );

      await t.commit();

      const token = generateToken(user);

      return res.status(201).json({
        message: "Compte partenaire cree. Votre etablissement est en attente de validation par l'administrateur.",
        token,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
        },
        establishment: newEstablishment,
      });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    // Le frontend envoie "identifiant" (email OU numero de telephone). On
    // garde la cle "email" acceptee aussi pour compatibilite ascendante.
    const { identifiant, email, motDePasse, captchaToken } = req.body;
    const login_id = identifiant || email;

    const isHuman = await verifyCaptcha(captchaToken);
    if (!isHuman) {
      return res.status(400).json({ message: "Verification anti-robot echouee." });
    }

    if (!login_id) {
      return res.status(400).json({ message: "Merci de renseigner votre email ou votre numero de telephone." });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: login_id }, { telephone: login_id }] },
    });
    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const match = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!match) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    if (user.statut === "bloque") {
      return res.status(403).json({ message: "Compte bloque. Contactez le support." });
    }

    const token = generateToken(user);

    return res.json({
      message: "Connexion reussie.",
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["motDePasse"] },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    if (user.statut === "bloque") {
      return res.status(403).json({ message: "Compte bloque. Contactez le support." });
    }

    const { id, nom, prenom, email, telephone, role } = user;
    return res.json({ id, nom, prenom, email, telephone, role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

// PUT /api/auth/me (mise a jour du profil connecte, mot de passe optionnel)
async function updateProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const { nom, prenom, email, telephone, motDePasse } = req.body;

    if (email && email !== user.email) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: "Format d'email invalide." });
      }
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: "Cet email est deja utilise." });
      }
      user.email = email;
    }

    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;

    if (motDePasse) {
      if (!PASSWORD_REGEX.test(motDePasse)) {
        return res.status(400).json({
          message: "Le mot de passe doit contenir au moins 8 caracteres, dont une lettre et un chiffre.",
        });
      }
      user.motDePasse = await bcrypt.hash(motDePasse, 10);
    }

    await user.save();

    return res.json({
      message: "Profil mis a jour.",
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
}

module.exports = { registerClient, registerPartner, login, me, updateProfile };
