import AppError from '../utils/AppError.js';

export default (...allowed) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) {
    return next(new AppError('You do not have access to this', 403));
  }
  next();
};