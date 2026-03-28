import { Router } from 'express';
import multer from 'multer';
import { ProfileController } from '../controllers';

const router = Router();
const profileController = new ProfileController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF and DOCX files
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// POST /api/profile - Create user profile
router.post('/', upload.single('resume'), (req, res) => {
  // Debug logging
  console.log('Received request body:', req.body);
  console.log('Received file:', req.file);
  
  // Parse JSON fields from FormData
  if (req.body.techStack && typeof req.body.techStack === 'string') {
    try {
      req.body.techStack = JSON.parse(req.body.techStack);
      console.log('Parsed techStack:', req.body.techStack);
    } catch (e) {
      console.error('Failed to parse techStack:', e);
    }
  }

  if (req.body.locations && typeof req.body.locations === 'string') {
    try {
      req.body.locations = JSON.parse(req.body.locations);
    } catch (e) {
      // fallback: treat as comma-separated string
      req.body.locations = req.body.locations.split(',').map((l: string) => l.trim()).filter(Boolean);
    }
  }
  
  // Convert numeric fields
  if (req.body.yearsExperience) {
    req.body.yearsExperience = Number(req.body.yearsExperience);
  }
  if (req.body.postingAgeWindow) {
    req.body.postingAgeWindow = Number(req.body.postingAgeWindow);
  }
  
  console.log('Processed body:', req.body);
  
  profileController.createProfile(req, res);
});

// GET /api/profile/:sessionId - Get user profile
router.get('/:sessionId', (req, res) => {
  profileController.getProfile(req, res);
});

export default router;