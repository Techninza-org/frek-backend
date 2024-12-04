import { Router } from "express";
import streamController from "../controller/stream.controller";
import middleware from "../utils/middleware";

const streamRouter = Router()

//@ts-ignore
streamRouter.post('/', middleware.AuthMiddleware, streamController.startStream)
//@ts-ignore
streamRouter.get('/', streamController.getAllStreams)

//@ts-ignore
streamRouter.delete('/:liveID', middleware.AuthMiddleware, streamController.stopStream)

//@ts-ignore
streamRouter.get('/testing', streamController.getAllAgoraStreamsOverApplication)

//@ts-ignore
streamRouter.get('/allSreamGroups', streamController.getAllStreamGroups)

//@ts-ignore
streamRouter.get('/createStream', streamController.createStreamGroup)

export default streamRouter