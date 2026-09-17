const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        statusCode: 403,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] roles.`
      });
    }
    next();
  };
};

module.exports = { requireRole };
