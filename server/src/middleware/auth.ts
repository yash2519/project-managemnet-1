import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: Role;
    teamIds?: number[];
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    // In production, you would verify the Cognito/JWT signature here.
    // For this transformation, we decode the token to identify the user via Cognito ID (sub).
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      res.status(401).json({ message: 'Invalid token format' });
      return;
    }

    const cognitoId = decoded.sub || decoded['cognito:username'];
    if (!cognitoId) {
      res.status(401).json({ message: 'Token missing identity claim' });
      return;
    }

    // Find user in DB
    let user = await prisma.user.findUnique({
      where: { cognitoId },
      include: { teams: true }
    });

    // Auto-onboard if user doesn't exist yet
    if (!user) {
      user = await prisma.user.create({
        data: {
          cognitoId,
          username: decoded['cognito:username'] || decoded.username || `user_${Math.floor(Math.random() * 10000)}`,
          role: 'MEMBER',
          profilePictureUrl: 'i1.jpg'
        },
        include: { teams: true }
      });
    }

    req.user = {
      userId: user.userId,
      role: user.role,
      teamIds: user.teams.map(t => t.teamId)
    };

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
};
