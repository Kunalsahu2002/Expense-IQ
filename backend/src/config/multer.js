const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/AppError");

// ─── Ensure uploads directory exists ───
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Storage config ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Unique filename: userId-timestamp-originalname
    const uniqueName = `${req.user?.id || "anon"}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ─── File filter — images only ───
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and HEIC images are accepted.`,
        400,
        "INVALID_FILE_TYPE"
      ),
      false
    );
  }
};

// ─── Multer instance ───
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 1,                    // Single receipt per scan
  },
});

/**
 * Cleanup helper — removes a temp file after processing.
 * Call this in a finally block after the AI extraction is complete.
 *
 * @param {string} filePath
 */
function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("[CLEANUP] Failed to remove temp file:", filePath, err);
    });
  }
}

module.exports = { upload, cleanupFile, UPLOADS_DIR };
