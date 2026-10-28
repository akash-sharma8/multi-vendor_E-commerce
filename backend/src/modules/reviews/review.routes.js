import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import requireRole from '../../middleware/role.js';
import * as ctrl from './review.controller.js';

const router = Router();

router.get('/:id/reviews', asyncHandler(ctrl.list));
router.post(
  '/:id/reviews',
  requireAuth,
  requireRole('CUSTOMER'),
  validate(ctrl.reviewSchema),
  asyncHandler(ctrl.create)
);

export default router;