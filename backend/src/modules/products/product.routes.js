import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import vendorApproved from '../../middleware/vendorApproved.js';
import upload from '../../middleware/upload.js';
import * as ctrl from './product.controller.js';

const router = Router();

const vendorOnly = [requireAuth, requireRole('VENDOR'), vendorApproved];

router.get('/mine/list', ...vendorOnly, asyncHandler(ctrl.listMine));
router.post('/', ...vendorOnly, validate(ctrl.productSchema), asyncHandler(ctrl.create));
router.put('/:id', ...vendorOnly, validate(ctrl.updateSchema), asyncHandler(ctrl.update));
router.delete('/:id', ...vendorOnly, asyncHandler(ctrl.remove));
router.post('/:id/images', ...vendorOnly, upload.array('images', 5), asyncHandler(ctrl.addImages));

router.get('/:id', asyncHandler(ctrl.getOne));

export default router;