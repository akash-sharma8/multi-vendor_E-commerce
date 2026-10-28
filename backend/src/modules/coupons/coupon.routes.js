import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './coupon.controller.js';

const router = Router();

router.post('/preview', requireAuth, requireRole('CUSTOMER'), validate(ctrl.previewSchema), asyncHandler(ctrl.preview));

router.post('/', requireAuth, requireRole('ADMIN'), validate(ctrl.createSchema), asyncHandler(ctrl.create));
router.get('/', requireAuth, requireRole('ADMIN'), asyncHandler(ctrl.list));

export default router;