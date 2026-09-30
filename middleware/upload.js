const multer = require("multer");
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const directory = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
fs.mkdirSync(directory, { recursive: true });
const extensions = {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif'};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directory);
  },
  filename: function (req, file, cb) {
    cb(null, randomUUID() + extensions[file.mimetype]);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => extensions[file.mimetype] ? cb(null, true)
    : cb(Object.assign(new Error('Upload a JPEG, PNG, WebP or GIF image'), {status:400})),
});

module.exports = upload;
