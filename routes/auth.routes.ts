import { Router } from "express";
import authController from "../controller/auth.controller";
import middleware from "../utils/middleware";

const authRouter = Router()

authRouter.post('/signup', authController.signUp)
authRouter.post('/login', authController.login)
//@ts-ignore
authRouter.put('/change-password', middleware.AuthMiddleware, authController.updatePassword)

authRouter.get('/profile/:id', authController.getProfileById)

authRouter.post('/social-login', authController.socialLogin)

authRouter.post('/send-otp', authController.SendOtp)
authRouter.post('/verify-otp', authController.VerifyOtp)
authRouter.post('/reset-password', authController.resetPassword)

export default authRouter