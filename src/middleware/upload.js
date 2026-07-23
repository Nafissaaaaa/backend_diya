const multer = require("multer");

// Stockage en memoire : les fichiers restent en RAM (req.file.buffer) le
// temps de la requete, puis sont envoyes vers Cloudinary (voir
// utils/uploadImages.js). Rien n'est ecrit sur le disque du serveur, ce qui
// est indispensable sur Render (systeme de fichiers ephemere).
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Seules les images JPG, PNG ou WEBP sont autorisees."));
  }
  cb(null, true);
}

// Max 10 photos par etablissement, 5 Mo par photo.
const uploadEstablishmentImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
});

// Wrapper qui transforme les erreurs multer (trop de fichiers, fichier trop
// lourd, mauvais type) en reponse JSON 400 propre plutot qu'un crash 500.
function handleImagesUpload(fieldName, maxCount = 10) {
  const middleware = uploadEstablishmentImages.array(fieldName, maxCount);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ message: `Vous ne pouvez envoyer que ${maxCount} photos maximum.` });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Chaque photo doit faire moins de 5 Mo." });
        }
        return res.status(400).json({ message: err.message });
      }
      if (err) {
        return res.status(400).json({ message: err.message || "Erreur lors de l'envoi des photos." });
      }
      next();
    });
  };
}

module.exports = { handleImagesUpload };
