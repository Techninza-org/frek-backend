import { NextFunction, Response } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { User } from "../models/user"


const Like = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const user = req.user
    
    const likedUserId = req.body.likedUserId
    if(!user || !likedUserId){
        return res.status(400).send({message: 'Invalid payload'})
    }
    if(user._id === likedUserId || user.liked.includes(likedUserId) || user.matched.includes(likedUserId)){
        return res.status(400).send({message: 'You cannot like this user'})
    }
    try{
        const likedUser = await User.findById(likedUserId)
        if (!likedUser) {
            return res.status(404).send({ message: 'Liked user not found' })
        }
        const isMatch = await likedUser.liked.includes(user._id);
        if(isMatch){
            if(user.matched.includes(likedUserId)){
                return res.status(200).send({message: 'Already matched'})
            }
            likedUser.matched.push(user._id);
            await likedUser.save();
            user.matched.push(likedUserId);
            await user.save();
            likedUser.liked.pull(user._id);
            await likedUser.save();
            return res.status(200).send({message: 'It is a match'});
        }else{
            likedUser.likedBy.push(user._id)
            await likedUser.save()
            user.liked.push(likedUserId)
            await user.save()
        }
        return res.status(200).send({message: 'User liked successfully'})
    }catch(err){
        return res.status(500).send({message: 'Error liking user'})
    }
}

const actionController = {Like}
export default actionController