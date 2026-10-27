import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import validate from '../../middleware/validate.js';
import requireAuth from '../../middleware/auth.js';
import * as ctrl from './auth.controller.js';

const router = Router();

router.post('/register', validate(ctrl.registerSchema), asyncHandler(ctrl.register));
router.post('/login', validate(ctrl.loginSchema), asyncHandler(ctrl.login));
router.get('/me', requireAuth, asyncHandler(ctrl.me));

export default router;