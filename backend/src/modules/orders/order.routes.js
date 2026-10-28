import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import vendorApproved from '../../middleware/vendorApproved.js';
import * as ctrl from './order.controller.js';

const router = Router();

const customerOnly = [requireAuth, requireRole('CUSTOMER')];
const vendorOnly = [requireAuth, requireRole('VENDOR'), vendorApproved];

// vendor routes first, so "vendor" is not read as an :id
router.get('/vendor/items', ...vendorOnly, asyncHandler(ctrl.vendorItems));
router.patch('/items/:id/status', ...vendorOnly, validate(ctrl.statusSchema), asyncHandler(ctrl.updateStatus));

router.post('/checkout', ...customerOnly, validate(ctrl.checkoutSchema), asyncHandler(ctrl.checkout));
router.get('/', ...customerOnly, asyncHandler(ctrl.listMine));
router.get('/:id', ...customerOnly, asyncHandler(ctrl.getOne));

export default router;