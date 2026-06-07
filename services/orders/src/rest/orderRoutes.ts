import { Router } from 'express';
import { ZodError } from 'zod';
import { orderService } from '../service/orderService.js';

export const orderRoutes = Router();

orderRoutes.get('/orders', async (_req, res, next) => {
  try {
    res.json(await orderService.list());
  } catch (err) {
    next(err);
  }
});

orderRoutes.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await orderService.getById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

orderRoutes.get('/users/:userId/orders', async (req, res, next) => {
  try {
    res.json(await orderService.listByUser(req.params.userId));
  } catch (err) {
    next(err);
  }
});

orderRoutes.post('/orders', async (req, res, next) => {
  try {
    const order = await orderService.create(req.body);
    res.status(201).json(order);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', issues: err.issues });
      return;
    }
    next(err);
  }
});
