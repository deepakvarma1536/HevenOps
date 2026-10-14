const express = require('express');
const router = express.Router();
const tenantAuthController = require('../controllers/tenantAuthController');
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

router.post('/login', validateRequest(schemas.tenantLogin), tenantAuthController.login);
router.post('/setup-password', validateRequest(schemas.tenantPasswordSetup), tenantAuthController.setupPassword);

module.exports = router;
