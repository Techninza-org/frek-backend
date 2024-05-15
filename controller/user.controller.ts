import { Request, Response, NextFunction } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { User } from "../models/user"

const getUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    return res.status(200).send({valid: true, user: req.user })
}

const updateUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {phone, bio, preference, email_notify, avatar} = req.body
        if(!user) return res.status(400).send({message: 'User not found'})
        if(!phone || !bio || !preference || !email_notify || !avatar) return res.status(400).send({message: 'All fields are required'})
            
        const updatedUser = await User.findByIdAndUpdate(user._id, {phone, bio, preference, email_notify, avatar}, {new: true})
        return res.status(200).send({message: 'User details updated successfully', user: updatedUser})
    }catch(err){
        return res.status(400).send({message: 'Error updating user details'})
    }
}

const deleteUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        const user_deleted = await User.findByIdAndDelete(user._id)
        return res.status(200).send({message: 'User deleted successfully', deletedUser: user_deleted})
    }catch(err){
        return res.status(400).send({message: 'Error deleting user'})
    }
}

const userController = {getUserDetails, updateUserDetails, deleteUser}
export default userController