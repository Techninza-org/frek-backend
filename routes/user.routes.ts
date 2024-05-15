import { Router } from "express";
import userController from "../controller/user.controller";
import middleware from "../utils/middleware";

const userRouter = Router()

//@ts-ignore
userRouter.get('/', userController.getUserDetails)
//@ts-ignore
userRouter.put('/', userController.updateUserDetails)
//@ts-ignore
userRouter.delete('/', userController.deleteUser)

export default userRouter