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
userRouter.put('/upload-img', upload.single("file"), userController.uploadImage)
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
userRouter.put('/unblock/:id', userController.unblockUserById)
//@ts-ignore
userRouter.get('/blocked', userController.blockedUserList)
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
//@ts-ignore
userRouter.post('/send-gift', userController.sendGift)
//@ts-ignore
userRouter.post('/buy-gift', userController.buyGift)
//@ts-ignore
userRouter.get('/gifts', userController.getGiftsTypes)
//@ts-ignore
userRouter.patch('/update-custom-active-status', userController.updateCustomActiveStatus)
//@ts-ignore
userRouter.get('/get-custom-active-status/:userId', userController.getCustomActiveStatusByUserId)
//@ts-ignore
userRouter.post('/new-transaction', userController.createTransaction)
//@ts-ignore
userRouter.get('/transaction', userController.getTransactionByDate)

export default userRouter