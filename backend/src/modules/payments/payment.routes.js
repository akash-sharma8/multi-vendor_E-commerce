import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './payment.controller.js';

const router = Router();

router.use(requireAuth, requireRole('CUSTOMER'));

router.post('/create', validate(ctrl.orderSchema), asyncHandler(ctrl.create));
router.post('/verify', validate(ctrl.verifySchema), asyncHandler(ctrl.verify));
router.post('/cancel', validate(ctrl.orderSchema), asyncHandler(ctrl.cancel));

export default router;