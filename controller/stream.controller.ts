import type { Response, NextFunction } from 'express'
import { ExtendedRequest } from '../utils/middleware'
import { Stream } from '../models/stream'
import { StreamGroup } from '../models/streamGroup'
import mongoose from 'mongoose'
import { User } from '../models/user'

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

const getAllAgoraStreamsOverApplication = async (req: Request, res: Response, next: NextFunction) => {
    const appId = '0ad2acf092ca4c088f5f00e41e170286'; // Replace with your App ID
    const appCertificate = 'c8300f5918aa498b90cbd74c880022c0'; // Replace with your App Certificate
    // const appCertificate = '0ad2acf092ca4c088f5f00e41e170286'; // Replace with your App ID
    // const appId = 'c8300f5918aa498b90cbd74c880022c0'; // Replace with your App Certificate
    const credentials = Buffer.from(`${appId}:${appCertificate}`).toString('base64'); // Encode credentials

    try{
        const response = await fetch(`https://api.agora.io/v1/apps`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${credentials}`, // Basic Authorization
                'Content-Type': 'application/json',
            },
        });

        console.log("response status: ", response.status)
        console.log("response text: ", await response.text())
        
        if (!response.ok) {
            // throw new Error(`HTTP error! status: ${response.status}`);
            return res.status(400).send({message: 'Error fetching streams'})
        }

        const data = await response.json();
        return res.status(200).send({data})
    }catch(err){
        console.log("error in getAllAgoraStreamsOverApplication", err)
        // return next(err)
        return res.status(400).send({message: 'Error in getAllAgoraStreamsOverApplication', status: 500})
    }
}

//create streamGroup
const createStreamGroup = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { currentUserId } = req.body;

    try {

        const user = await User.findById(currentUserId);
        if (!user) { return res.status(404).send({ message: 'User not found', status: 404 }) }

        const streamGroup = await StreamGroup.create({hostUserId: user._id, hostUsername: user.username, hostProfilePic: user.avatar});

        return res.status(200).send({ message: `Stream group created successfully with streamGroupId: ${streamGroup._id}`, streamGroup: streamGroup, status: 200 });
    } catch (error) {
        console.log("error in createStreamGroup", error);
        return res.status(500).send({message: 'Error creating stream group', status: 500, error: error})
    }
}

// get all streamGroup over application (streamGroup and channel are same thing)
const getAllStreamGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const allStreamGroups = await StreamGroup.find().populate('hostUserId').populate('coHostUserIds').populate('connectedUsers').populate('bouncerUserIds').populate('streamRequestUserIds');

        const allStreamGroupWithConnectedUserCount = allStreamGroups.map((streamGroup) => {
            return {
                ...streamGroup._doc,
                connectedUserCount: streamGroup.connectedUsers.length
            }
        });

        return res.status(200).send({ message: "fetched succussfully", allGroups: allStreamGroupWithConnectedUserCount, status: 200 });
    } catch (error) {
        console.log("error in getAllAgoraStreams", error)
        return res.status(500).send({message: 'Error fetching streams', status: 500, error: error})
    }
}

//send streamGroup join request
const sendStreamGroupJoinRequest = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {streamGroupId} = req.body;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(streamGroupId)) { return res.status(400).send({ message: 'Invalid streamGroupId', invalidSteamGroupId: true, status: 400 }) }

    try {
        
        const streamGroup = await StreamGroup.findById(streamGroupId);
        if (!streamGroup) { return res.status(404).send({ message: 'StreamGroup not found', invalidSteamGroupId: true, status: 404 }) }
        if (!streamGroup.isLive) { return res.status(400).send({ message: 'StreamGroup is not live', notLive: true, status: 400 }) }

        streamGroup.streamRequestUserIds.push(user._id);

        await streamGroup.save();

        return res.status(200).send({ message: `Join request sent successfully to streamGroupId: ${streamGroup._id} and agoraStreamId: ${streamGroup.agoraStreamId}`, status: 200 });
    } catch (error) {
        console.log("error in sendStreamGroupJoinRequest", error)
        return res.status(500).send({message: 'Error sending join request', status: 500, error: error})
    }
}

//accept streamGroup join request
const acceptStreamGroupJoinRequest = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {streamGroupId, acceptingUserId} = req.body;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(streamGroupId)) { return res.status(400).send({ message: 'Invalid streamGroupId', invalidSteamGroupId: true, status: 400 }) }

    try {
        
        const acceptingUser = await User.findById(acceptingUserId);
        if (!acceptingUser) { return res.status(404).send({ message: 'Accepting user not found', invalidSteamGroupId: true, status: 404 }) }

        const streamGroup = await StreamGroup.findOne({ _id: streamGroupId, hostUserId: user._id });
        if (!streamGroup) { return res.status(404).send({ message: 'StreamGroup not found by current userId', invalidSteamGroupId: true, status: 404 }) }
        if (!streamGroup.isLive) { return res.status(400).send({ message: 'StreamGroup is not live', notLive: true, status: 400 }) }

        const isRequested = streamGroup.streamRequestUserIds.includes(acceptingUserId);
        const isAlreadyConnected = streamGroup.coHostUserIds.includes(acceptingUserId);
        if (!isRequested) { return res.status(400).send({ message: 'User has not requested to join this streamGroup', notRequested: true, status: 400 }) }
        if (isAlreadyConnected) { return res.status(400).send({ message: 'User is already connected to this streamGroup', alreadyConnected: true, status: 400 }) }

        streamGroup.coHostUserIds.push(acceptingUserId);

        await streamGroup.save();

        return res.status(200).send({ message: `Join request accepted successfully for streamGroupId: ${streamGroup._id} and agoraStreamId: ${streamGroup.agoraStreamId}`, status: 200 });
    } catch (error) {
        console.log("error in acceptStreamGroupJoinRequest", error)
        return res.status(500).send({message: 'Error accepting join request', status: 500, error: error})
    }
}

const streamController = {startStream, getAllStreams, stopStream, getAllAgoraStreamsOverApplication, getAllStreamGroups, sendStreamGroupJoinRequest, acceptStreamGroupJoinRequest, createStreamGroup}
export default streamController