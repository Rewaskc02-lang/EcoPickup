const errorMiddleware = (err, req, res, next) => {
  console.error('Server Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).render('error', {
    title: `Error ${statusCode}`,
    statusCode,
    message
  });
};

module.exports = errorMiddleware;
