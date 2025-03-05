/**
 * Async handler to wrap route handlers and catch errors
 * Eliminates the need for try/catch blocks in routes
 *
 * @param {function} fn - The async route handler function
 * @returns {function} Middleware function that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
