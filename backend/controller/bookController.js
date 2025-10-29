const mongoose = require("mongoose");

const Book = require("../Models/Book");

// @desc    Create a new book
// @route   POST /api/books
// @access  Private
const createBook = async (req, res) => {
  try {
    const { title, author, subtitle, chapters } = req.body;

    if (!title || !author) {
      return res
        .status(400)
        .json({ message: "Please provide a title and author" });
    }

    const book = await Book.create({
      userId: req.user._id,
      title,
      author,
      subtitle,
      chapters,
    });

    res.status(201).json(book);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

// @desc    Call all books for a user
// @route   GET /api/books
// @access  Private
const getBooks = async (req, res) => {
  try {
    const books = await Book.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json(books);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

// @desc    Get a single book by ID
// @route   GET /api/books/:id
// @access  Private
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID format" });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.userId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to view this book" });
    }

    res.status(200).json(book);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID format" });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.userId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to update this book" });
    }

    const updateBook = await Book.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    res.status(200).json(updateBook);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID format" });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.userId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this book" });
    }

    await book.deleteOne();

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

// @desc    Update a book's cover image
// @route   PUT /api/books/cover/:id
// @access  Private
const updateBookCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID format" });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.userId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to update this book" });
    }

    if (req.file) {
      book.coverImage = `/${req.file.path}`;
    } else {
      return res.status(400).json({ message: "No image file provided" });
    }

    const updateBook = await book.save();

    res.status(200).json(updateBook);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  updateBookCover,
};
