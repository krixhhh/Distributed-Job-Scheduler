import { Request, Response, NextFunction } from "express";
import { HttpError } from "./custom-errors.js";
import { logger } from "../config/logger.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Log unhandled internal exceptions
  logger.error(`Unhandled system exception: ${err.message}\nStack: ${err.stack}`);

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
  });
};
