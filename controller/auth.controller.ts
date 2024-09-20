import type {Request, Response, NextFunction } from 'express'
import helper from '../utils/helpers'
import { User } from '../models/user'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import { getUserToken, sendNotif, sendNotification } from '../app'

const signUp = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'email', 'password', 'gender', 'dob'])
    if(!isValidPayload){
        return res.status(400).send({error: 'Invalid payload', error_message: 'name, email, password, gender, dob are required'})
    }
    const {name, email, password, gender, dob} = req.body
    const dobString = String(dob);
    const parts = dobString.split('/');
    const year = parts[2];
    const age = new Date().getFullYear() - Number(year);
    
    try{
        const existingUser = await User.findOne({email})
        if(existingUser){
            return res.status(400).send({valid: false, message: 'User already exists'})
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        await User.create({
            name,
            email,
            password: hashedPassword,
            gender,
            dob: dobString,
            age,
            avatar: "https://thefrekapp.com/public/images/1718965492683-default.png",
        })
        const token = jwt.sign({email: req.body.email}, process.env.JWT_SECRET!, {
            expiresIn: '7d'
        })
        return res.status(200).send({valid: true, message: 'User created successfully', token})
    }catch(err){
        return res.status(500).send({message: 'Error creating user'})
    }
}

const login = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPaylod = helper.isValidatePaylod(req.body, ['email', 'password'])
    if(!isValidPaylod){
        return res.status(400).send({error: "Invalid payload", error_message: "email, password are required"})
    }
    const {email, password} = req.body
    try{
        const user = await User.findOne({email})
        if(!user) return res.status(400).send({message: "User doesn't exist"})
        const isCorrectPassword = bcrypt.compareSync(password, user.password)
        if(! isCorrectPassword){
            return res.status(400).send({valid: false, message: "Incorrect Password"})
        }
        const token = jwt.sign({email: user.email}, process.env.JWT_SECRET!, {
            expiresIn: '7d'
        })
        user.last_seen = new Date()
        await user.save()
        sendNotif(user.id, user.id, user.avatar || '', 'Welcome', `Welcome to Frek App, ${user.name}`)
        const receiverToken = await getUserToken(user.id);
        console.log('Receiver Token:', receiverToken);
        if (!receiverToken) {
            console.log('Receiver not found or has no registration token', user.id);
        } else {
            const payload = {
                title: 'Welcome',
                body: `Welcome to Frek App, ${user.username}!`
            };
            await sendNotification(receiverToken, payload);
            console.log('Notification sent to receiver');
        }
        return res.status(200).send({valid: true, message: "Logged in successfully", user, token})
    }catch(err){
        return res.status(500).send({error: 'Error while Login'})
    }
}

const updatePassword = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const isValidPayload = helper.isValidatePaylod(req.body, ['oldPassword', 'newPassword'])
    if(!isValidPayload){
        return res.status(400).send({error: 'Invalid payload', error_message: 'oldPassword, newPassword are required'})
    }
    const {oldPassword, newPassword} = req.body
    const user = req.user
    try{
        if(!user) return res.status(400).send({message: 'User not found'})
        const isCorrectPassword = bcrypt.compareSync(oldPassword, user.password)
        if(!isCorrectPassword){
            return res.status(400).send({message: 'Incorrect old password'})
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.last_seen = new Date()
        await User.findByIdAndUpdate(user._id, {password: hashedPassword})
        return res.status(200).send({message: 'Password updated successfully'})
    }catch(err){
        return res.status(500).send({message: 'Error updating password'})
    }
}


const getProfileById = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const {id} = req.params
        let user = await User.findById(id)
        if(!user) return res.status(404).send({message: 'User not found'})
        user.password = undefined
    
        return res.status(200).send({user})
    }catch(err){
        return next(err)
    }
}

const authController = {signUp, login, updatePassword, getProfileById}
export default authController