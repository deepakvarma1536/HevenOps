const express = require('express');
const router = express.Router();
const tenantPortalController = require('../controllers/tenantPortalController');
const tenantAuthenticate = require('../middleware/tenantAuthenticate');
const validateRequest = require("../middleware/validateRequest");
const { request } = require("../utils/requestSchemas");
const { z } = require("zod");
const { schemas } = require("../utils/requestSchemas");

// Apply authentication middleware to all tenant portal routes
router.use(tenantAuthenticate);

router.get('/me', tenantPortalController.getProfile);
router.put('/me', validateRequest(request({
    body: z.object({
        name: z.string().trim().min(1).max(100).optional(),
        phone: z.string().trim().max(20).optional(),
        emergency_contact: z.string().trim().max(100).optional(),
    }).strict().refine((body) => Object.keys(body).length > 0, "Provide at least one profile field"),
})), tenantPortalController.updateProfile);
router.get('/my-stay', tenantPortalController.getMyStay);
router.get('/my-rent-dues', validateRequest(schemas.tenantPortalDueList), tenantPortalController.getMyRentDues);
router.get('/my-payments', validateRequest(schemas.tenantPortalPaymentList), tenantPortalController.getMyPayments);
router.get('/my-deposits', validateRequest(schemas.tenantPortalDepositList), tenantPortalController.getMyDeposits);

module.exports = router;
