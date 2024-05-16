import type {Request, Response, NextFunction } from 'express'
import helper from '../utils/helpers'
import { User } from '../models/user'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const signUp = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'email', 'password', 'gender', 'dob'])
    if(!isValidPayload){
        return res.status(400).send({error: 'Invalid payload', error_message: 'name, email, password, gender, dob are required'})
    }
    const {name, email, password, gender, dob} = req.body
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
            dob,
            age: 18
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
        return res.status(200).send({valid: true, message: "Logged in successfully", user, token})
    }catch(err){
        return res.status(500).send({error: 'Error while Login'})
    }
}

const authController = {signUp, login}
export default authController