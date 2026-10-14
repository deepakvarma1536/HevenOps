const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// POST /api/auth/register
router.post("/register", validateRequest(schemas.authRegister), AuthController.register);

// POST /api/auth/login
router.post("/login", validateRequest(schemas.authLogin), AuthController.login);

// GET /api/auth/me (Protected)
router.get("/me", authenticate, AuthController.me);

module.exports = router;
