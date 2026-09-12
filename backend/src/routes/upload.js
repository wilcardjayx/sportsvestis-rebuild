// ─── IMAGE UPLOAD ROUTE ──────────────────────────────────────────────────
// Hardened against the common upload-endpoint attack surface:
//  - MIME type is checked against an allowlist AND the real file signature
//    (magic bytes) is inspected, not just the client-reported header, since
//    a browser or attacker can label any file "image/png" freely.
//  - File extension is derived server-side from the detected type, never
//    taken from the original filename, which blocks path traversal and
//    double-extension tricks (e.g. "product.png.php").
//  - Filenames are randomly generated (uuid), so nothing user-controlled
//    ever reaches the filesystem path.
//  - Size is capped well below anything that could be used for a DoS.
//  - Uploaded files are served as static assets only, never executed.

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const { requireAuth, requireAdmin } = require("../middleware/security");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Allowlist of accepted image types, mapped to their real magic-byte signatures
const ALLOWED_TYPES = {
  "image/jpeg": { ext: ".jpg", magic: [0xff, 0xd8, 0xff] },
  "image/png": { ext: ".png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/webp": { ext: ".webp", magic: [0x52, 0x49, 0x46, 0x46] }, // "RIFF", WEBP checked further below
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — plenty for a product photo, not enough for abuse

// Store in memory first so we can inspect magic bytes before ever touching disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
    cb(null, true);
  },
});

/** Confirms the file's actual bytes match its claimed type — the client's
 *  reported mimetype is never trusted on its own. */
function verifyMagicBytes(buffer, mimetype) {
  const sig = ALLOWED_TYPES[mimetype];
  if (!sig) return false;

  const header = buffer.subarray(0, sig.magic.length);
  const matches = sig.magic.every((byte, i) => header[i] === byte);
  if (!matches) return false;

  // WEBP has "RIFF" then 4 bytes size then "WEBP" — confirm the fuller signature
  if (mimetype === "image/webp") {
    const webpTag = buffer.subarray(8, 12).toString("ascii");
    if (webpTag !== "WEBP") return false;
  }

  return true;
}

// ── POST /api/upload — admin only, single image ──────────────────────────
router.post("/", requireAuth, requireAdmin, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    const { buffer, mimetype, size } = req.file;

    if (size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: "Image exceeds the 5MB size limit." });
    }

    if (!verifyMagicBytes(buffer, mimetype)) {
      return res.status(400).json({ error: "File content does not match a valid image format." });
    }

    // Server decides the filename and extension entirely — nothing from
    // the client's original filename is ever used.
    const filename = `${uuid()}${ALLOWED_TYPES[mimetype].ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    res.status(201).json({
      url: `/uploads/${filename}`,
      message: "Image uploaded successfully.",
    });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Multer-specific error handler (file too large, wrong type, etc.)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Image exceeds the 5MB size limit." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
