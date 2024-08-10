import { Router } from "express";
import streamController from "../controller/stream.controller";
import middleware from "../utils/middleware";

const streamRouter = Router()

//@ts-ignore
streamRouter.post('/', middleware.AuthMiddleware, streamController.startStream)
//@ts-ignore
streamRouter.get('/', streamController.getAllStreams)

//@ts-ignore
streamRouter.delete('/', middleware.AuthMiddleware, streamController.stopStream)

export default streamRouter