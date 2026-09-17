const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email
    };
    res.locals.currentUser = req.user;
    next();
  } catch (error) {
    // Clear invalid / expired cookie
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

module.exports = { requireAuth };
