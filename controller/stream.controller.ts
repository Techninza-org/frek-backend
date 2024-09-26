import type { Response, NextFunction } from 'express'
import { ExtendedRequest } from '../utils/middleware'
import { Stream } from '../models/stream'

const startStream = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        user.last_seen = new Date()
        await user.save()
        const userId = req.user?._id
        const username = req.user?.name
        const profilePic = req.user?.avatar
        const {liveID, isHost} = req.body
        if(!liveID ){
            return res.status(400).send({message: 'liveID is required'})
        }
        if(!isHost ){
            return res.status(400).send({message: 'isHost is required'})
        }
        const liveExists = await Stream.findOne({liveID: liveID})
        if(liveExists){
            return res.status(400).send({message: 'Stream already exists'})
        }
        const stream = await Stream.create({userId, username, liveID, isHost, profilePic})
        return res.status(200).send({message: 'Stream started successfully', stream})
    }catch(err){
        return next(err)
    }
}

// const updateStream = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
//     try{
//         const {liveID, isHost} = req.body
//         if(!liveID ){
//             return res.status(400).send({message: 'liveID is required'})
//         }
//         if(!isHost ){
//             return res.status(400).send({message: 'isHost is required'})
//         }
//         const stream = await Stream.findOneAndUpdate({liveID: liveID}, {liveID, isHost}, {new: true})
//     }catch(err){
//         return next(err)
//     }
// }

const getAllStreams = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const streams = await Stream.find({})
        return res.status(200).send({streams})
    }catch(err){
        return next(err)
    }
}

const stopStream = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        user.last_seen = new Date()
        await user.save()
        const {liveID} = req.params
        if(!liveID ){
            return res.status(400).send({message: 'liveID is required'})
        }
        const stream = await Stream.findOneAndDelete({liveID: liveID})
        if(!stream){
            return res.status(404).send({message: 'Stream not found'})
        }
        return res.status(200).send({message: 'Stream stopped successfully', stream})
    }catch(err){
        return next(err)
    }
}

const streamController = {startStream, getAllStreams, stopStream}
export default streamController