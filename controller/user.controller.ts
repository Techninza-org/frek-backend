import { Response, NextFunction } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { User } from "../models/user"
import helper from "../utils/helpers"
import { Notification } from "../models/notification"

const getUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    //update last seen 
    const user = req.user
    if(!user) return res.status(400).send({message: 'User not found'})
    user.last_seen = new Date()
    await user.save()
    user.password = undefined
    return res.status(200).send({valid: true, user: req.user })
}

const updateUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {phone, bio, preference, email_notify, name, theme_color, lat, long, bubble_color, registrationToken} = req.body

        if(req.file && user.avatar_updated > 4){
            return res.status(201).send({message: 'You have reached the maximum number of avatar updates'})
        }
        
        if(!user) return res.status(400).send({message: 'User not found'})
            
        const updatedUser = await User.findByIdAndUpdate(user._id, {
            phone, bio, registrationToken, preference, email_notify, name, theme_color, bubble_color, lat, long, avatar: req.file ? helper.imageUrlGen(req.file) : undefined
        }, { new: true });

        if(req.file) {
            updatedUser.avatar_updated = user.avatar_updated + 1
            await updatedUser.save()
        }
            
        delete (updatedUser as any).password
        updatedUser.last_seen = new Date()
        await user.save()
        return res.status(200).send({message: 'User details updated successfully', user: updatedUser})
        
    }catch(err){
        return next(err)
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
        user.last_seen = new Date()
        const updatedQuestions = await user.save()
        updatedQuestions.password = undefined
        return res.status(200).send({message: 'Questions added successfully', updatedQuestions})
    }catch(err){
        return res.status(500).send({message: 'Error adding questions'})
    }
}

// const updateUserAvatar = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
//     try{
//         const user = req.user
//         if(!user) return res.status(400).send({message: 'User not found'})
        
//         if(!req.file) return res.status(400).send({message: 'Please upload an image'})
//         const updatedUser = await User.findByIdAndUpdate(user._id, {avatar: helper.imageUrlGen(req.file)}, {new: true})
//         return res.status(200).send({message: 'User avatar updated successfully', user: updatedUser})
//     }catch(err){
//         return res.status(400).send({message: 'Error updating user avatar'})
//     }
// }

const uploadPics = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        if(!req.files || !Array.isArray(req.files)) return res.status(400).send({message: 'Pics not found'})
        const images = req.files.map((file: any) => helper.imageUrlGen(file))
        const updatedUser = await User.findByIdAndUpdate(user._id, {pics: images}, {new: true})
        updatedUser.last_seen = new Date()
        await updatedUser.save()
        updatedUser.password = undefined
        return res.status(200).send({message: 'User pics uploaded successfully', files: req.files, user: updatedUser})
    }catch(err){
        return res.status(400).send({message: 'Error updating user pics'})
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
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        user.last_seen = new Date()
        await user.save()
        const users = await User.find({ _id: { $ne: req.user._id } });
        users.filter(user => !user.matched.includes(req.user._id) && !user.liked.includes(req.user._id) && !user.disliked.includes(req.user._id))
        users.sort(() => Math.random() - 0.5)
        const feed = users.map(user => ({id: user._id, name: user.name, age: user.age, avatar: user.avatar}))
        return res.status(200).send({feed})
    }catch(error){
        return res.status(400).send({message: 'Error fetching feed'})
    }
}

const getMatchedUsers = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        user.last_seen = new Date()
        await user.save()
        const matchedUsers = await User.find({_id: {$in: user.matched}})
        const feed = matchedUsers.map(user => ({id: user._id, name: user.name, age: user.age, avatar: user.avatar, last_seen: user.last_seen}))
        return res.status(200).send({feed})
    }catch(err){
        return res.status(400).send({message: 'Error fetching matched users'})
    }
}

const getNotifications = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        user.last_seen = new Date()
        await user.save()
        const notifs = await Notification.find({receiver_id: user._id}).sort({createdAt: -1})
        return res.status(200).send({notifications: notifs})
    }catch(err){
        return res.status(400).send({message: 'Error fetching notifications'})
    }
}

const markAsRead = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        const notif = await Notification.findByIdAndUpdate(req.params.id, {isRead: true}, {new: true})
        return res.status(200).send({message: 'Notification marked as read', notification: notif})
    }catch(err){
        return res.status(400).send({message: 'Error marking notification as read'})
    }
}

const deleteNotification = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        const notif = await Notification.findByIdAndDelete(req.params.id)
        return res.status(200).send({message: 'Notification deleted', notification: notif})
    }catch(err){
        return res.status(400).send({message: 'Error deleting notification'})
    }
}

const userController = {getUserDetails, signupQuestions, updateUserDetails, deleteUser, getFeed, getMatchedUsers, uploadPics, getNotifications, markAsRead, deleteNotification}
export default userController