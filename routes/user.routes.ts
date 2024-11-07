import { Router } from "express";
import userController from "../controller/user.controller";
import { upload } from "..";

const userRouter = Router()

//@ts-ignore
userRouter.get('/', userController.getUserDetails)
//@ts-ignore
userRouter.get('/feed', userController.getFeed)
//@ts-ignore
userRouter.get('/matched', userController.getMatchedUsers)
//@ts-ignore
userRouter.put('/', upload.single("file"), userController.updateUserDetails)
//@ts-ignore
userRouter.put('/questions', userController.signupQuestions)
//@ts-ignore
// userRouter.put('/avatar', upload.single("file"), userController.updateUserAvatar)
//@ts-ignore
userRouter.put('/pics', upload.array("files", 3), userController.uploadPics)
//@ts-ignore
userRouter.delete('/', userController.deleteUser)
//@ts-ignore
userRouter.get('/notifications', userController.getNotifications)
//@ts-ignore
userRouter.put('/notifications/:id', userController.markAsRead)
//@ts-ignore
userRouter.delete('/notifications/:id', userController.deleteNotification)
//@ts-ignore
userRouter.post('/payment', userController.addPayment)
//@ts-ignore
userRouter.get('/payment-history', userController.paymentHistory)
//@ts-ignore
userRouter.put('/block/:id', userController.blockUserById)
//@ts-ignore
userRouter.put('/report/:id', userController.reportUserById)
//@ts-ignore
userRouter.post('/superlike', userController.sendSuperLike)
//@ts-ignore
userRouter.get('/transactions', userController.getWalletTransactionByDate)
//@ts-ignore
userRouter.post('/buy-superlikes', userController.buySuperLikes)
//@ts-ignore
userRouter.get('/superlike-offers', userController.getSuperlikeOffers)
//@ts-ignore
userRouter.post('/update-preferences', userController.updatePreferences)

export default userRouter