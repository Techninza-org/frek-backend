import { Response, NextFunction } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { User } from "../models/user"
import helper from "../utils/helpers"

const getUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    return res.status(200).send({valid: true, user: req.user })
}

const updateUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {phone, bio, preference, email_notify} = req.body
        if(!user) return res.status(400).send({message: 'User not found'})
        if (phone === undefined || bio === undefined || preference === undefined || email_notify === undefined) {
            return res.status(400).send({message: 'All fields are required'});
        }
        const updatedUser = await User.findByIdAndUpdate(user._id, {phone, bio, preference, email_notify}, {new: true})
        return res.status(200).send({message: 'User details updated successfully', user: updatedUser})
    }catch(err){
        return res.status(400).send({message: 'Error updating user details'})
    }
}

const signupQuestions = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const user = req.user
    const isValidPayload = helper.isValidatePaylod(req.body, ['questions'])
    if(!isValidPayload){
        return res.status(400).send({error: 'Invalid payload', error_message: 'questions are required'})
    }
    const {questions} = req.body
    try{
        if(!user){
            return res.status(400).send({message: 'User not found'})
        }
        user.signup_questions = questions
        const updatedQuestions = await user.save()
        return res.status(200).send({message: 'Questions added successfully', updatedQuestions})
    }catch(err){
        return res.status(500).send({message: 'Error adding questions'})
    }
}

const updateUserAvatar = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        
        if(!req.file) return res.status(400).send({message: 'Please upload an image'})
        const updatedUser = await User.findByIdAndUpdate(user._id, {avatar: helper.imageUrlGen(req.file)}, {new: true})
        return res.status(200).send({message: 'User avatar updated successfully', user: updatedUser})
    }catch(err){
        return res.status(400).send({message: 'Error updating user avatar'})
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

const getFeed = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const users = await User.find({ _id: { $ne: req.user._id } });
        users.sort(() => Math.random() - 0.5)
        const feed = users.map(user => ({name: user.name, bio: user.bio, avatar: user.avatar}))
        return res.status(200).send({feed})
    }catch(error){
        return res.status(400).send({message: 'Error fetching feed'})
    }
}

const getMatchedUsers = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        const matchedUsers = await User.find({_id: {$in: user.matched}}, {_id: 1})
        return res.status(200).send({matchedUsers})
    }catch(err){
        return res.status(400).send({message: 'Error fetching matched users'})
    }
}

const userController = {getUserDetails, signupQuestions, updateUserDetails, deleteUser, updateUserAvatar, getFeed, getMatchedUsers}
export default userController