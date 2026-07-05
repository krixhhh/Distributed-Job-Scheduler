import { Request } from "express";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  projectRole?: string;
  apiKey?: {
    id: string;
    scope: string;
    projectId: string;
  };
}
