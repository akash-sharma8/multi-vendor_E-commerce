import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './admin.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/vendors', asyncHandler(ctrl.listVendors));
router.patch('/vendors/:id', validate(ctrl.vendorUpdateSchema), asyncHandler(ctrl.updateVendor));

export default router;