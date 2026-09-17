const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Helper to sign JWT token
const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );
};

// Helper to determine redirection path based on role
const getRedirectPathByRole = (role) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'agent':
      return '/agent';
    case 'citizen':
    default:
      return '/citizen';
  }
};

// GET /login
exports.showLogin = (req, res) => {
  // If already logged in, redirect to respective dashboard
  if (req.cookies && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      return res.redirect(getRedirectPathByRole(decoded.role));
    } catch (e) {
      res.clearCookie('token');
    }
  }
  res.render('auth/login', {
    title: 'Login - E-Waste Pickup System',
    error: null,
    success: null
  });
};

// GET /register
exports.showRegister = (req, res) => {
  if (req.cookies && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      return res.redirect(getRedirectPathByRole(decoded.role));
    } catch (e) {
      res.clearCookie('token');
    }
  }
  res.render('auth/register', {
    title: 'Register - E-Waste Pickup System',
    error: null
  });
};

// POST /register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register - E-Waste Pickup System',
        error: 'Email is already registered. Please login or use a different email.'
      });
    }

    // Create user (password is automatically hashed via pre-save hook)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'citizen',
      phone,
      address
    });

    // Generate JWT token
    const token = signToken(user);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Redirect to respective dashboard based on role
    return res.redirect(getRedirectPathByRole(user.role));
  } catch (error) {
    console.error('Registration error:', error);
    return res.render('auth/register', {
      title: 'Register - E-Waste Pickup System',
      error: error.message || 'Failed to register account.'
    });
  }
};

// POST /login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Login - E-Waste Pickup System',
        error: 'Please provide both email and password.',
        success: null
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - E-Waste Pickup System',
        error: 'Invalid email or password',
        success: null
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login - E-Waste Pickup System',
        error: 'Invalid email or password',
        success: null
      });
    }

    // Generate token
    const token = signToken(user);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Redirect to dashboard by role
    return res.redirect(getRedirectPathByRole(user.role));
  } catch (error) {
    console.error('Login error:', error);
    return res.render('auth/login', {
      title: 'Login - E-Waste Pickup System',
      error: 'An error occurred during login. Please try again.',
      success: null
    });
  }
};

// GET /logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};
