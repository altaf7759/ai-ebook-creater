const express = require("express");

const {
  generateOutline,
  generateChapterContent,
} = require("../controller/aiController");
const protect = require("../middlewares/authMiddlewares");

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

router.post("/generate-outline", generateOutline);
router.post("/generate-chapter-content", generateChapterContent);

module.exports = router;
