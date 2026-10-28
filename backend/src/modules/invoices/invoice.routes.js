import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './invoice.controller.js';

const router = Router();

router.get('/:id/invoice', requireAuth, requireRole('CUSTOMER'), asyncHandler(ctrl.download));

export default router;