const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = "Email already registered";
  }

  if (statusCode === 500) {
    console.error(err);
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;