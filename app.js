// 1. Dotenv configuration
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const citizenRoutes = require('./routes/citizenRoutes');
const agentRoutes = require('./routes/agentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Middleware
const errorMiddleware = require('./middleware/errorMiddleware');

// 2. Express application
const app = express();

// 3. Body parsing and Cookie-parser middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Static folder configuration
app.use(express.static(path.join(__dirname, 'public')));

// 5. View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 6. Connect to MongoDB Atlas
connectDB();

// 7. Route Mounting
app.use('/', authRoutes);
app.use('/citizen', citizenRoutes);
app.use('/agent', agentRoutes);
app.use('/admin', adminRoutes);
app.use('/', dashboardRoutes);

// 8. Global Error Handling Middleware (mounted LAST)
app.use(errorMiddleware);

// Start listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
