import { Router } from "express";
import middleware from "../utils/middleware";
import adminController from "../controller/admin.controller";

const adminRouter = Router()

adminRouter.post('/signup', adminController.adminSignup)
adminRouter.post('/login', adminController.adminLogin)
//@ts-ignore
adminRouter.get('/user', middleware.AuthMiddleware, adminController.getAllUsers)
//@ts-ignore
adminRouter.get('/user/:id', middleware.AuthMiddleware, adminController.getUserPosts)
//@ts-ignore
adminRouter.put('/user/:id', middleware.AuthMiddleware, adminController.switchActiveUser)
//@ts-ignore
adminRouter.get('/transaction', middleware.AuthMiddleware, adminController.getTransactions)
//@ts-ignore
adminRouter.get('/report', middleware.AuthMiddleware, adminController.getReports)
//@ts-ignore
adminRouter.put('/setDbConstant', middleware.AuthMiddleware, adminController.setDbConstant)
//@ts-ignore
adminRouter.get('/getDbConstants', middleware.AuthMiddleware, adminController.getDbConstants)
//@ts-ignore
adminRouter.post('/createPackage', middleware.AuthMiddleware, adminController.createPackage)
//@ts-ignore
adminRouter.get('/getAllPackages', middleware.AuthMiddleware, adminController.getAllPackages)
//@ts-ignore
adminRouter.put('/updatePackage/:packageId', middleware.AuthMiddleware, adminController.updatePackage)
//@ts-ignore
adminRouter.delete('/deletePackage/:packageId', middleware.AuthMiddleware, adminController.deletePackage)
//@ts-ignore
adminRouter.delete('/deleteDbConstant', middleware.AuthMiddleware, adminController.deleteDbConstants)


export default adminRouter