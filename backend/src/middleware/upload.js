import multer from 'multer';
import AppError from '../utils/AppError.js';

const allowed = ['image/jpeg', 'image/png', 'image/webp'];

export default multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 }, // 3 MB each, 5 files
  fileFilter(req, file, cb) {
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError('Only jpg, png or webp images allowed', 400));
    }
    cb(null, true);
  },
});