export default function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message;

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 3 MB)' : err.message;
  }

  if (status === 500) {
    console.error(err);
    message = 'Something went wrong';
  }
  res.status(status).json({ error: message });
}