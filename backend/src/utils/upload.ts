import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import multer from 'multer';

import { ALLOWED_MIME_TYPES, config } from '../config/index.js';
import { AppError } from '../utils/response.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Tipe file tidak diizinkan: ${file.mimetype}`));
    }
  },
});

export const sanitizeFilename = (name: string) =>
  path.basename(name).replace(/[^a-zA-Z0-9._\-\s]/g, '_');
