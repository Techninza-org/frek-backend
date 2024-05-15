import { Router } from "express";
import actionController from "../controller/action.controller";

const actionRouter = Router()

//@ts-ignore
actionRouter.post('/like', actionController.Like)

export default actionRouter