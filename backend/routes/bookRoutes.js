const express = require("express");

const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  updateBookCover,
} = require("../controller/bookController");
const protect = require("../middlewares/authMiddlewares");
const upload = require("../middlewares/uploadMiddlewares");

const router = express.Router();

// Apply protect middleware to all in this file
router.use(protect);

router.route("/").post(createBook).get(getBooks);
router.route("/:id").get(getBookById).put(updateBook).delete(deleteBook);
router.route("/cover/:id").put(upload, updateBookCover);

module.exports = router;
