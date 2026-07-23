// Usage: authorize("admin") ou authorize("owner", "admin")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentification requise." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Acces refuse : role insuffisant pour cette action.",
      });
    }
    next();
  };
}

module.exports = authorize;
