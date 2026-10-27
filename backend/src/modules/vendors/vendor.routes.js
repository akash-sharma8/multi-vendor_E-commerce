import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './vendor.controller.js';

const router = Router();

router.use(requireAuth, requireRole('VENDOR'));
router.post('/apply', validate(ctrl.applySchema), asyncHandler(ctrl.apply));
router.get('/me', asyncHandler(ctrl.mine));

export default router;