function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
