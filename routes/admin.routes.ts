import { Router } from "express";
import middleware from "../utils/middleware";
import adminController from "../controller/admin.controller";

const adminRouter = Router()

adminRouter.post('/login', adminController.adminLogin)

export default adminRouter