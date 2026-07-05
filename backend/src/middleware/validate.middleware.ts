import { Request, Response, NextFunction } from "express";
import { Schema } from "zod";
import { BadRequestError } from "../errors/custom-errors.js";

export const validateBody = (schema: Schema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      const issues = err.errors?.map((x: any) => ({
        field: x.path.join("."),
        message: x.message,
      }));
      next(new BadRequestError("Validation failed", issues));
    }
  };
};
