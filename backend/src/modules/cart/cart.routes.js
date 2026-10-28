import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './cart.controller.js';

const router = Router();

router.use(requireAuth, requireRole('CUSTOMER'));

router.get('/', asyncHandler(ctrl.get));
router.post('/items', validate(ctrl.addSchema), asyncHandler(ctrl.add));
router.patch('/items/:productId', validate(ctrl.quantitySchema), asyncHandler(ctrl.update));
router.delete('/items/:productId', asyncHandler(ctrl.remove));
router.delete('/', asyncHandler(ctrl.clear));

export default router;