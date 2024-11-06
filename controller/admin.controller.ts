import type {Request, Response, NextFunction } from 'express'
import helper from '../utils/helpers'
import { User } from '../models/user'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import { getUserToken, sendNotif, sendNotification } from '../app'

const adminSignup = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPaylod = helper.isValidatePaylod(req.body, ['name', 'email', 'password'])
    if(!isValidPaylod){
        return res.status(400).send({error: "Invalid payload", error_message: "name, email, password are required"})
    }
    const {name, email, password} = req.body
    try{
        const user = await User.findOne({email})
        if(user) return res.status(400).send({message: "User already exists"})
        const hashedPassword = bcrypt.hashSync(password, 10)
        const newUser = new User({
            name, email, password: hashedPassword, isAdmin: true
        })
        await newUser.save()
        return res.status(200).send({status: 200, message: "Admin created successfully"})
    }catch(err){
        return res.status(500).send({message: 'Error creating admin'})
    }
}

const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPaylod = helper.isValidatePaylod(req.body, ['email', 'password'])
    if(!isValidPaylod){
        return res.status(400).send({error: "Invalid payload", error_message: "email, password are required"})
    }
    const {email, password} = req.body
    try{
        const user = await User.findOne({email})
        if(!user) return res.status(400).send({message: "User doesn't exist"})
        if(!user.isAdmin) return res.status(400).send({message: "User is not an admin"})
        const isCorrectPassword = bcrypt.compareSync(password, user.password)
        if(! isCorrectPassword){
            return res.status(400).send({valid: false, message: "Incorrect Password"})
        }
        const token = jwt.sign({email: user.email}, process.env.JWT_SECRET!, {
            expiresIn: '7d'
        })
        user.last_seen = new Date()
        await user.save()
        return res.status(200).send({status: 200, valid: true, message: "Login successful", token})
    }catch(err){
        return res.status(500).send({message: 'Error logging in'})
    }
}

const getAllUsers = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const users = await User.find({isAdmin: false}).sort({createdAt: -1});
        return res.status(200).send({status: 200, users})
    }catch(err){
        return res.status(500).send({message: 'Error fetching users'})
    }
}

const switchActiveUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {id} = req.params
    try{
        const user = await User.findById(id)
        if(!user) return res.status(400).send({message: "User doesn't exist"})
        user.active = !user.active
        await user.save()
        return res.status(200).send({status: 200, user})
    }catch(err){
        return res.status(500).send({status: 500, message: 'Error updating user'})
    }
}

const getUserPosts = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {id} = req.params
    try{
        const user = await User.findById(id)
        if(!user) return res.status(400).send({message: "User doesn't exist"})
        const userPics = user.pics
        const avatar = user.avatar
        return res.status(200).send({status: 200, userPics, avatar})       
    }catch(err){
        return res.status(500).send({status: 500, message: 'Error fetching user posts'})
    }
}

const adminController = { adminSignup, adminLogin, getAllUsers, switchActiveUser, getUserPosts }
export default adminController