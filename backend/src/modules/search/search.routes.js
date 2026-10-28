import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import * as ctrl from './search.controller.js';

const router = Router();
router.get('/', asyncHandler(ctrl.run));

export default router;