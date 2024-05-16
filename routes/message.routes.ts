import Router from "express";
import messageController from "../controller/message.controller";

const messageRouter = Router()

//@ts-ignore
messageRouter.post('/send/:receiverId', messageController.sendMessage)
//@ts-ignore
messageRouter.get('/conversation/:receiverId', messageController.getConversation)
//@ts-ignore
messageRouter.get('/conversations', messageController.getAllConversations)

export default messageRouter