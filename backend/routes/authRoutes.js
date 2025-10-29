const express = require("express");

const {
  registerUser,
  loginUser,
  getProfile,
  updateUserProfile,
} = require("../controller/authController");
const protect = require("../middlewares/authMiddlewares");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateUserProfile);

module.exports = router;
