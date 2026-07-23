const cloudinary = require("cloudinary").v2;

// Les 3 variables suivantes viennent du dashboard Cloudinary (gratuit) :
// https://cloudinary.com/console -> CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// A definir dans le .env local et dans les variables d'environnement Render.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
