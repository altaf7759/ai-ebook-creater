const express = require("express");

const protect = require("../middlewares/authMiddlewares");
const {
  exportAsDocument,
  exportAsPDF,
} = require("../controller/exportController");

const router = express.Router();

router.get("/:id/pdf", protect, exportAsPDF);
router.get("/:id/docx", protect, exportAsDocument);

module.exports = router;
