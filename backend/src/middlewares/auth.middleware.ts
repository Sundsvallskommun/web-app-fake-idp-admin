import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.session.adminUser) {
      next();
    } else {
      next(new HttpException(401, 'NOT_AUTHORIZED'));
    }
  } catch {
    next(new HttpException(401, 'AUTH_FAILED'));
  }
};

export default authMiddleware;
