import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "shared";

const router = Router();
const controller = new AuthController();

router.post("/register", validateBody(RegisterSchema), controller.register);
router.post("/login", validateBody(LoginSchema), controller.login);
router.post("/logout", authenticate as any, controller.logout as any);
router.post("/refresh", controller.refresh);
router.post("/verify-email", validateBody(VerifyEmailSchema), controller.verifyEmail);
router.post("/forgot-password", validateBody(ForgotPasswordSchema), controller.forgotPassword);
router.post("/reset-password", validateBody(ResetPasswordSchema), controller.resetPassword);

export default router;
