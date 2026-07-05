import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { UnauthorizedError, ForbiddenError } from "../errors/custom-errors.js";
import { AuthRequest } from "../types/express.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Check for API Key first (programmatic access)
    const apiKeyHeader = req.headers["x-api-key"] || req.query.apiKey;
    if (apiKeyHeader && typeof apiKeyHeader === "string") {
      const dbKey = await prisma.apiKey.findUnique({
        where: { key: apiKeyHeader },
        include: { project: true },
      });

      if (!dbKey) {
        throw new UnauthorizedError("Invalid API Key");
      }

      if (dbKey.expiresAt && dbKey.expiresAt < new Date()) {
        throw new UnauthorizedError("API Key has expired");
      }

      req.apiKey = {
        id: dbKey.id,
        scope: dbKey.scope,
        projectId: dbKey.projectId,
      };

      return next();
    }

    // 2. Check for Bearer Token or Cookie
    let token = "";
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.cookie) {
      const parsedToken = req.headers.cookie
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
      if (parsedToken) {
        token = decodeURIComponent(parsedToken);
      }
    }

    if (!token) {
      throw new UnauthorizedError("Authentication token is missing");
    }

    // Verify JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new UnauthorizedError("User no longer exists");
      }

      req.user = {
        id: user.id,
        email: user.email,
      };

      next();
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired authentication token");
    }
  } catch (error) {
    next(error);
  }
};

export const requireProjectMember = (requiredRole?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId;

      if (!projectId) {
        throw new ForbiddenError("Project Context (projectId) is required");
      }

      // If authorized via API Key, verify project scope matches
      if (req.apiKey) {
        if (req.apiKey.projectId !== projectId) {
          throw new ForbiddenError("API Key is not authorized for this project");
        }
        if (requiredRole === "ADMIN" && req.apiKey.scope !== "ADMIN") {
          throw new ForbiddenError("API Key requires ADMIN scopes for this action");
        }
        return next();
      }

      // Authorized via User
      if (!req.user) {
        throw new UnauthorizedError("User authentication required");
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: projectId as string,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError("You are not a member of this project");
      }

      if (requiredRole && membership.role !== requiredRole && membership.role !== "ADMIN") {
        throw new ForbiddenError(`Action requires ${requiredRole} access`);
      }

      req.projectRole = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};
