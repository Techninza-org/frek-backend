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
    
    const {registrationToken} = req.body;
    if (!registrationToken){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken is required'})}
    if (registrationToken && typeof registrationToken !== 'string'){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken must be a string'})}

    const dobString = String(dob);
    const parts = dobString.split('/');
    const year = parts[2];
    const age = new Date().getFullYear() - Number(year);
    
    // const age = 22; //vivek
    console.log('Age:', age);//vivek
    
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
            registrationToken: registrationToken
        })
        const token = jwt.sign({email: req.body.email}, process.env.JWT_SECRET!, {
            expiresIn: '7d'
        })
        return res.status(200).send({valid: true, message: 'User created successfully', token})
    }catch(err){
        console.log(err); //vivek
        return res.status(500).send({message: 'Error creating user'})
    }
}

const login = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPaylod = helper.isValidatePaylod(req.body, ['email', 'password'])
    if(!isValidPaylod){
        return res.status(400).send({error: "Invalid payload", error_message: "email, password are required"})
    }
    const {email, password} = req.body
    const {registrationToken} = req.body;

    if (!registrationToken){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken is required'})}
    if (registrationToken && typeof registrationToken !== 'string'){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken must be a string'})}

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

        user.registrationToken = registrationToken;

        await user.save()
        sendNotif(user.id, user.id, user.avatar || '', 'Welcome', `Welcome to Frek App, ${user.name}`, 'System')
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


        const userWithoutUnwantedFields = user.toObject();
        delete userWithoutUnwantedFields.liked;
        delete userWithoutUnwantedFields.likedBy;
        delete userWithoutUnwantedFields.disliked;
        delete userWithoutUnwantedFields.matched;

        console.log('User:', user);
        return res.status(200).send({valid: true, message: "Logged in successfully", user: userWithoutUnwantedFields, token})
    }catch(err){
        return res.status(500).send({error: 'Error while Login'})
    }
}

const socialLogin = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'email', 'type'])
    if(!isValidPayload){
        return res.status(400).send({error: 'Invalid payload', error_message: 'name, email and type are required'})
    }
    const {name, email, type} = req.body

    try{
        const user = await User.findOne({email, type})
        if(!user){
            const newUser = await User.create({
                name,
                email,
                type
            })
            const token = jwt.sign({email: newUser.email}, process.env.JWT_SECRET!, {
                expiresIn: '7d'
            })
            return res.status(200).send({valid: true, message: 'User created successfully', user: newUser, token})
        }
        const token = jwt.sign({email: user.email}, process.env.JWT_SECRET!, {
            expiresIn: '7d'
        })
        user.last_seen = new Date()
        await user.save()
        return res.status(200).send({valid: true, message: 'Logged in successfully', user, token})
    }catch(err){
        console.log(err); 
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

const SendOtp = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        if (!helper.isValidatePaylod(req.body, ['email'])) {
            return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email requried' })
        }
        const { email } = req.body
        const otp = Math.floor(100000 + Math.random() * 900000)
        const user = await User.findOne({email})

        if (!user) return res.status(400).send({ status: 404, error: 'Not found', error_description: 'user not found' })

        try {
            await User.findOneAndUpdate(
                { email },
                { otp },
                { new: true } 
            );

            helper.sendMail(email, 'The Frek App Account Verification', `Your OTP is ${otp}`);
            return res.status(200).send({ status: 200, message: 'OTP sent successfully' });
        } catch (err) {
            return _next(err);
        }
    } catch (err) {
        return _next(err)
    }
}

const VerifyOtp = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        if (!helper.isValidatePaylod(req.body, ['email', 'otp'])) {
            return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email and OTP are required' });
        }

        const { email, otp } = req.body;
        
        if (!Number.isInteger(otp)) {
            return res.status(400).send({
                status: 400,
                error: 'Bad Request',
                error_description: 'Invalid Otp, OTP must be a number',
            });
        }
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send({ status: 404, error: 'Not found', error_description: 'User not found' });
        }


        if (user.otp === Number(otp)) {
            await User.findOneAndUpdate(
                { email },
                { $unset: { otp: "" } },
                { new: true }
            );

            return res.status(200).send({ status: 200, message: 'OTP verified successfully' });
        } else {
            return res.status(400).send({ status: 400, error: 'Invalid OTP', error_description: 'The OTP provided is incorrect' });
        }
    } catch (err) {
        return _next(err);
    }
};

const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    // Validate payload to ensure required fields are present
    const isValidPayload = helper.isValidatePaylod(req.body, ['email', 'password']);
    if (!isValidPayload) {
        return res.status(400).send({ error: 'Invalid payload', error_message: 'Email and password are required' });
    }

    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password and last_seen timestamp
        await User.findByIdAndUpdate(user._id, { password: hashedPassword, last_seen: new Date() });

        return res.status(200).send({ message: 'Password reset successfully' });
    } catch (err) {
        return res.status(500).send({ message: 'Error resetting password' });
    }
};


const authController = {signUp, login, updatePassword, getProfileById, socialLogin, SendOtp, VerifyOtp, resetPassword}
export default authController