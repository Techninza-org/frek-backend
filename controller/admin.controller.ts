import type {Request, Response, NextFunction } from 'express'
import helper from '../utils/helpers'
import { User } from '../models/user'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import { getUserToken, sendNotif, sendNotification } from '../app'

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

const adminController = { adminLogin }
export default adminController