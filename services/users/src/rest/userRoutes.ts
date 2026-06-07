import { Router } from 'express';
import { ZodError } from 'zod';
import { userService } from '../service/userService.js';

/**
 * REST surface over the same userService used by GraphQL resolvers. No business
 * logic here — translation between HTTP and the service layer only.
 */
export const userRoutes = Router();

userRoutes.get('/users', async (_req, res, next) => {
  try {
    res.json(await userService.list());
  } catch (err) {
    next(err);
  }
});

userRoutes.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

userRoutes.post('/users', async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', issues: err.issues });
      return;
    }
    next(err);
  }
});
