import { Router } from "express";
import userController from "../controller/user.controller";
import middleware from "../utils/middleware";

const userRouter = Router()

//@ts-ignore
userRouter.get('/', middleware.AuthMiddleware ,userController.getUserDetails)

export default userRouter