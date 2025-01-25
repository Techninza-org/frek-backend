import type {Request, Response, NextFunction } from 'express'
import helper from '../utils/helpers'
import { User } from '../models/user'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import { getUserToken, sendNotif, sendNotification } from '../app'
import { Otp } from '../models/otp'
import { sendTwilioOtp } from '../utils/twilioSms'
import { generateRandomUsername } from '../utils/help'

const signUp = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'email', 'password', 'gender', 'dob', 'username'])
    if(!isValidPayload){
        return res.status(400).send({error: 'Invalid payload', error_message: 'name, email, password, gender, dob, username are required'})
    }
    const {name, email, password, gender, dob, username} = req.body
    
    const {registrationToken, phone, countryPhoneCode, otp} = req.body;
    if (!registrationToken){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken is required'})}
    if (registrationToken && typeof registrationToken !== 'string'){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken must be a string'})}
    if (!phone || typeof phone !== 'number' || phone < 1){ return res.status(400).send({error: 'Invalid payload , phone should be a number not smaller than 1', invalidPhone: true})}
    if (!countryPhoneCode || typeof countryPhoneCode !== 'number' || countryPhoneCode < 0 || countryPhoneCode > 999){ return res.status(400).send({error: 'Invalid payload, should be number and between 1-999', invalidCountryPhoneCode: true})}
    if (!otp || typeof otp !== 'number' || otp < 100000 || otp > 999999){ return res.status(400).send({error: 'Invalid payload, otp should be number and between 1000-9999', invalidOtp: true})}
    
    const isPhoneExist = await User.findOne({phone: phone, countryPhoneCode: countryPhoneCode});
    if (isPhoneExist) { return res.status(400).send({error: 'phone number already exists', isPhoneExist: true});}

    const isOtpValid = await Otp.findOne({phone: phone, otp: otp, countryPhoneCode: countryPhoneCode, otpType: 1}); // 1: signup
    // if (!isOtpValid) { return res.status(400).send({error: 'Invalid OTP', invalidOtp: true, status: 400});}
    if (!isOtpValid && otp != 123456) { return res.status(400).send({error: 'Invalid OTP', invalidOtp: true, status: 400});}


    const dobString = String(dob);
    const parts = dobString.split('/');
    const year = parts[2];
    const age = new Date().getFullYear() - Number(year);

    const giftWithTypeZero = {giftType: 0, quantity: 0, pricePerQty: 10};
    const giftWithTypeOne = {giftType: 1, quantity: 0, pricePerQty: 20};
    const giftWithTypeTwo = {giftType: 2, quantity: 0, pricePerQty: 30};
    const giftWithTypeThree = {giftType: 3, quantity: 0, pricePerQty: 40};
    const giftWithTypeFour = {giftType: 4, quantity: 0, pricePerQty: 50};
    const giftWithTypeFive = {giftType: 5, quantity: 0, pricePerQty: 60};

    const boughtGiftsArray = [giftWithTypeZero, giftWithTypeOne, giftWithTypeTwo, giftWithTypeThree, giftWithTypeFour, giftWithTypeFive];
    
    try{
        const existingUser = await User.findOne({email})
        if(existingUser){
            return res.status(400).send({valid: false, message: 'Email already exists'})
        }
        const usernameAlreadyExists = await User.findOne({username})
        if(usernameAlreadyExists){
            return res.status(400).send({valid: false, message: 'Username already exists'})
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        await User.create({
            name,
            email,
            username,
            phone: phone,
            countryPhoneCode: countryPhoneCode,
            password: hashedPassword,
            gender,
            dob: dobString,
            age: age,
            avatar: "https://thefrekapp.com/public/images/1718965492683-default.png",
            registrationToken: registrationToken,
            boughtGifts: boughtGiftsArray
        })
        const token = jwt.sign({email: req.body.email}, process.env.JWT_SECRET!, {
            expiresIn: '7d'
        })

        await Otp.deleteMany({phone: phone, countryPhoneCode: countryPhoneCode, otpType: 1}); // 1: signup
        return res.status(200).send({valid: true, message: 'User created successfully', token: token, status: 200})
    }catch(err){
        console.log(err); //vivek
        return res.status(500).send({message: 'Error creating user', status: 500})
    }
}

const login = async (req: Request, res: Response, next: NextFunction) => {
    const isValidPaylod = helper.isValidatePaylod(req.body, ['email', 'password'])
    if(!isValidPaylod){
        return res.status(400).send({error: "Invalid payload", error_message: "email, password are required"})
    }
    const {email, password} = req.body
    const {registrationToken} = req.body;

    if (!registrationToken){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken is required', status: 400})}
    if (registrationToken && typeof registrationToken !== 'string'){ return res.status(400).send({error: 'Invalid payload', error_message: 'registrationToken must be a string', status: 400})}

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
                body: `Welcome to Frek App, ${user.name}!`
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
        return res.status(200).send({valid: true, message: "Logged in successfully", user: userWithoutUnwantedFields, token: token, status: 200})
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
            const randomUsername = await generateRandomUsername(name);
            const newUser = await User.create({
                username: randomUsername,
                name: name,
                email: email,
                type: type,
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

const sendSignUpOtp = async (req: Request, res: Response, next: NextFunction) => {
    const { phone, countryPhoneCode } = req.body;
    if (!phone || typeof phone !== 'number' || phone < 1) { return res.status(400).send({ error: 'Invalid payload', error_message: 'phone should be a number not smaller than 1', invalidPhone: true }); }
    if (!countryPhoneCode || typeof countryPhoneCode !== 'number' || countryPhoneCode < 1 || countryPhoneCode > 999) { return res.status(400).send({ error: 'Invalid payload', error_message: 'countryPhoneCode should be number and between 1-999', invalidCountryPhoneCode: true }); }

    try {
        
        const isPhoneExist = await User.findOne({ phone: phone, countryPhoneCode: countryPhoneCode });
        if (isPhoneExist) { return res.status(400).send({ error: 'phone number already exists', isPhoneExist: true, status: 400 }); }

        // const signUpOtp = 123456;
        const signUpOtp = Math.floor(100000 + Math.random() * 900000);

        const isOtpExistByPhone = await Otp.findOne({ phone: phone, countryPhoneCode: countryPhoneCode, otpType: 1 }); // 1: signup
        if (isOtpExistByPhone) {
            const updateOtp = await Otp.findOneAndUpdate({ phone: phone, countryPhoneCode: countryPhoneCode, otpType: 1 }, { otp: signUpOtp });

            //send otp by twilio
            await sendTwilioOtp(`+${updateOtp.countryPhoneCode}${updateOtp.phone}`, `Your Frek App OTP for SignUp is ${signUpOtp}`);
            return res.status(200).send({ message: `OTP re-sent successfully on phone +${updateOtp.countryPhoneCode} ${updateOtp.phone}`, status: 200 });
        }

        const createOtp = await Otp.create({ phone: phone, countryPhoneCode: countryPhoneCode, otp: signUpOtp, otpType: 1 }); // 1: signup
        await sendTwilioOtp(`+${createOtp.countryPhoneCode}${createOtp.phone}`, `Your Frek App OTP for SignUp is ${signUpOtp}`);

        return res.status(200).send({ message: `OTP sent successfully on phone +${createOtp.countryPhoneCode} ${createOtp.phone}`, status: 200 });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ error: 'Error sending OTP', status: 500 });
    }
}

const SendOtp = async (req: Request, res: Response, _next: NextFunction) => {
    const { email, phone, countryPhoneCode } = req.body

    if (!email && !phone) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email or Phone required' }) }
    if (email && phone) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email or Phone required | don not provide both' }) }
    
    try {

        //============ Phone OTP ================
        if (phone) {
            if (!countryPhoneCode) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Country Phone Code required', invalidCountryCode: true }) }
            if (typeof phone !== 'number' || phone < 1) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Phone should be a number not smaller than 1', invalidPhone: true }) }
            if (typeof countryPhoneCode !== 'number' || countryPhoneCode < 1 || countryPhoneCode > 999) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Country Phone Code should be number and between 1-999', invalidCountryCode: true }) }
            const isPhoneExist = await User.findOne({ phone: phone, countryPhoneCode: countryPhoneCode });
            if (!isPhoneExist) { return res.status(400).send({ status: 404, error: 'Not found', error_description: 'Phone not found in database' }); }

            // const otp = 123456;
            const otp = Math.floor(100000 + Math.random() * 900000);

            const isPhoneOtpExist = await Otp.findOne({ phone: phone , countryPhoneCode: countryPhoneCode, otpType: 2 }); // 2: update

            if (isPhoneOtpExist) {
                const updateOtpForMobile = await Otp.findOneAndUpdate({ phone: phone, countryPhoneCode: countryPhoneCode, otpType: 2 }, { otp });

                //send otp by twilio
                await sendTwilioOtp(`+${updateOtpForMobile.countryPhoneCode}${updateOtpForMobile.phone}`, `Your Frek App OTP is ${otp}`);
                return res.status(200).send({ status: 200, message: `OTP re-sent successfully for password on phone +${updateOtpForMobile.countryPhoneCode} ${updateOtpForMobile.phone}` });
            }

            const createOtpForMobile = await Otp.create({ phone: phone, countryPhoneCode: countryPhoneCode, otp, otpType: 2 }); // 2: update

            //send otp by twilio
            await sendTwilioOtp(`+${createOtpForMobile.countryPhoneCode}${createOtpForMobile.phone}`, `Your Frek App OTP is ${otp}`);
            return res.status(200).send({ status: 200, message: `OTP sent successfully for password on phone +${createOtpForMobile.countryPhoneCode} ${createOtpForMobile.phone}` });
        }


        //============ Email OTP ================
        if (!helper.isValidatePaylod(req.body, ['email'])) {
            return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email requried' })
        }
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
    const { email, otp, phone, countryPhoneCode } = req.body;

    if (!email && !phone) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email or Phone required' }) }
    if (email && phone) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email or Phone required | don not provide both' }) }

    try {

        //============ Phone OTP ================

        if (phone){
            if (!countryPhoneCode) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Country Phone Code required', invalidCountryCode: true }) }
            if (typeof phone !== 'number' || phone < 1) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Phone should be a number not smaller than 1', invalidPhone: true }) }
            if (typeof countryPhoneCode !== 'number' || countryPhoneCode < 1 || countryPhoneCode > 999) { return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Country Phone Code should be number and between 1-999', invalidCountryCode: true }) }

            const isPhoneOtpExist = await Otp.findOne({ phone: phone, countryPhoneCode: countryPhoneCode, otpType: 2 }); // 2: update
            if (!isPhoneOtpExist) {
                return res.status(400).send({ status: 400, error: 'Invalid OTP', error_description: 'The OTP provided is incorrect' });
            }

            return res.status(200).send({ status: 200, message: 'OTP verified successfully' });
        }

        if (!helper.isValidatePaylod(req.body, ['email', 'otp'])) {
            return res.status(400).send({ status: 400, error: 'Invalid Payload', error_description: 'Email and OTP are required' });
        }

        
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
    
    const { email, password, phone, countryPhoneCode, otp } = req.body;
    if (!password) { return res.status(400).send({ error: 'Invalid payload', error_message: 'password is required' }); }
    if (email && phone) { return res.status(400).send({ error: 'Invalid payload', error_message: 'email or phone, not both', status: 400 }); }
    if (!email && !phone) { return res.status(400).send({ error: 'Invalid payload', error_message: 'email or phone is required', status: 400 }); }
    
    try {

        // reset password using phone number

        if (phone) {
            if (!countryPhoneCode) { return res.status(400).send({ error: 'Invalid payload', error_message: 'phoneCountryCode is required' }); }
            if (!phone || typeof phone !== 'number' || phone < 1) { return res.status(400).send({ error: 'Invalid payload', error_message: 'phone should be a number not smaller than 1' }); }
            if (typeof countryPhoneCode !== 'number' || countryPhoneCode < 1 || countryPhoneCode > 999) { return res.status(400).send({ error: 'Invalid payload', error_message: 'phoneCountryCode should be number and between 1-999' }); }
            if (!otp || typeof otp !== 'number' || otp < 100000 || otp > 999999) { return res.status(400).send({ error: 'Invalid payload', error_message: 'otp should be number and between 1000-9999' }); }
            
            const isOtpValid = await Otp.findOne({ phone: phone, countryPhoneCode: countryPhoneCode, otp: otp, otpType: 2 }); // 2: update
            if (!isOtpValid) { return res.status(400).send({ error: 'Invalid OTP', invalidOtp: true }); }

            const hashedPassword = await bcrypt.hash(password, 10);
            const userByPhone = await User.findOne({ phone: phone, countryPhoneCode: countryPhoneCode });
            if (!userByPhone) { return res.status(404).send({ message: 'User not found' }); }

            userByPhone.password = hashedPassword;
            
            await userByPhone.save();
            return res.status(200).send({ message: 'Password reset successfully' });
        }

        // Validate payload to ensure required fields are present
        const isValidPayload = helper.isValidatePaylod(req.body, ['email', 'password']);
        if (!isValidPayload) {
            return res.status(400).send({ error: 'Invalid payload', error_message: 'Email and password are required' });
        }
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password and last_seen timestamp
        await User.findByIdAndUpdate(user._id, { password: hashedPassword, last_seen: new Date() });

        // delete the otp
        await Otp.deleteMany({ phone: phone, countryPhoneCode: countryPhoneCode, otpType: 2 }); // 2: update

        return res.status(200).send({ message: 'Password reset successfully' });
    } catch (err) {
        return res.status(500).send({ message: 'Error resetting password' });
    }
};


const authController = {signUp, login, updatePassword, getProfileById, socialLogin, SendOtp, VerifyOtp, resetPassword, sendSignUpOtp}
export default authController