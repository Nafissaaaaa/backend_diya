// Verifie un token reCAPTCHA v2 aupres de Google.
// Utilise fetch natif (disponible depuis Node 18+, ce qui evite d'ajouter axios ici).
async function verifyCaptcha(token) {
  if (!token) return false;

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY manquante dans les variables d'environnement.");
    return false;
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Erreur de verification reCAPTCHA:", err.message);
    return false;
  }
}

module.exports = { verifyCaptcha };
