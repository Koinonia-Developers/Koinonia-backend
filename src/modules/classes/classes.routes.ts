import { Router } from 'express';
import { classesController } from './classes.controller';

const router = Router();

// Public route for registration dropdowns
router.get('/', classesController.getAllClasses);

export default router;
