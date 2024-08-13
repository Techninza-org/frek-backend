import { Router } from "express";
import actionController from "../controller/action.controller";

const actionRouter = Router()

//@ts-ignore
actionRouter.post('/like', actionController.Like)
//@ts-ignore
actionRouter.post('/dislike', actionController.dislike)

export default actionRouter