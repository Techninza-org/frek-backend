import { Request, Response, NextFunction } from "express"
import { ExtendedRequest } from "../utils/middleware"

const getUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    return res.status(200).send({valid: true, user: req.user })
}

const updateUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const user = req.user
    const {phone, bio, preference, email_notify, avatar} = req.body
    // Update user details
    
}

const deleteUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const user = req.user
    // Delete user

}

const userController = {getUserDetails}
export default userController