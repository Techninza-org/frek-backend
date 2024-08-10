import { NextFunction, Response } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { Conversation } from "../models/conversation"
import { Message } from "../models/message"
import { getReceiverSocketId, io } from "../app"


export const sendMessage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        user.last_seen = new Date()
        await user.save()
        const senderId = req.user._id
        const receiverId = req.params.receiverId
        const message = req.body.message
        if(!message || !receiverId) return res.status(400).send({message: 'Receiver and message are required'})
        if(senderId === receiverId) return res.status(400).send({message: 'You can not send message to yourself'})
        
        let getConversation = await Conversation.findOne({participants: {$all: [senderId, receiverId]}})
        if(!getConversation){
            getConversation = new Conversation({participants: [senderId, receiverId]})
        }
        const newMessage = await Message.create({sender: senderId, receiver: receiverId, message})
        if(newMessage){
            getConversation.messages.push(newMessage._id)
        }
        await Promise.all([getConversation.save(), newMessage.save()])

        // const receiverSocketId = getReceiverSocketId(receiverId)
        // if(receiverSocketId){
        //     io.emit('newMessage', {message: newMessage})
        // }
        io.emit('newMessage', {message: newMessage})

        return res.status(200).send({message: 'Message sent'})
    }catch(err){
        return res.status(500).send({message: 'Error sending message'})
    }
}

export const getConversation = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const senderId = req.user._id
        const receiverId = req.params.receiverId
        if(!receiverId) return res.status(400).send({message: 'Receiver is required'})
        if(senderId === receiverId) return res.status(400).send({message: 'You can not get conversation with yourself'})
        req.user.last_seen = new Date()
        await req.user.save()
        
        let getConversation = await Conversation.findOne({participants: {$all: [senderId, receiverId]}}).populate('messages').populate('participants', '-password -__v')
        if(!getConversation) return res.status(404).send({message: 'No conversation found'})
        return res.status(200).send({conversation: getConversation})
    }catch(err){
        return res.status(500).send({message: 'Error getting conversation'})
    }
}

export const getAllConversations = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const senderId = req.user._id
        let conversations = await Conversation.find({participants: senderId}).populate('messages').populate('participants', '-password -__v')
        return res.status(200).send({conversations})
    }catch(err){
        return res.status(500).send({message: 'Error getting conversations'})
    }
}

const messageController = {sendMessage, getConversation, getAllConversations}
export default messageController