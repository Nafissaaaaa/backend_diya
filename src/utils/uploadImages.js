const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

// Envoie un seul buffer (fichier en memoire, via multer.memoryStorage) vers
// Cloudinary et renvoie le resultat de l'upload (dont result.secure_url).
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "diyafa/establishments", resource_type: "image", ...options },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

// Upload en parallele les photos d'un etablissement (req.files de multer, en
// memoire, jusqu'a 10). Renvoie un tableau d'URLs https persistantes.
async function uploadEstablishmentImages(files = []) {
  if (!files.length) return [];
  const results = await Promise.all(files.map((file) => uploadBufferToCloudinary(file.buffer)));
  return results.map((r) => r.secure_url);
}

module.exports = { uploadBufferToCloudinary, uploadEstablishmentImages };
