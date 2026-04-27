import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    role: string;
    permissions: string[];
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      companyId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const rolePermissions = user.role.rolePermissions.map(
      (rolePermission) => rolePermission.permission.name
    );

    const extraPermissions = user.userPermissions.map(
      (userPermission) => userPermission.permission.name
    );

    const permissions = Array.from(
      new Set([...rolePermissions, ...extraPermissions])
    );

    req.user = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role.name,
      permissions,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};