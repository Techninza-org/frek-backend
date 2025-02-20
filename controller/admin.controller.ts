import type {Request, Response, NextFunction } from 'express'
import helper from '../utils/helpers'
import { User } from '../models/user'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import { getUserToken } from '../app'
import { Reported } from '../models/reported'
import { Transaction } from '../models/transaction'
import { DatabaseConstant } from '../models/databaseConstant'
import { Package } from '../models/packages'
import mongoose from 'mongoose'

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
        const users = await User.find({isAdmin: false}).sort({createdAt: -1}).select(['name', 'email', 'active', 'createdAt', 'dob' ]);
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
        return res.status(200).send({status: 200, user: user.name, active: user.active})
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

const getReports = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const reports = await Reported.find().sort({createdAt: -1}).populate('reporter', 'name email').populate('reported', 'name email')
        return res.status(200).send({status: 200, reports})
    }catch(err){
        return res.status(500).send({message: 'Error fetching users'})
    }
}

const getTransactions = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const transactions = await Transaction.find().sort({createdAt: -1}).populate('userId', 'name email')
        return res.status(200).send({status: 200, transactions})
    }catch(err){
        return res.status(500).send({message: 'Error fetching transactions'})
    }
}

const setDbConstant = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { perSuperLikePrice } = req.body;

    if (!perSuperLikePrice || isNaN(perSuperLikePrice)) { return res.status(400).send({message: 'price should be a number', invalidPrice: true, status: 400}) }

    try {
        
        const databaseConstant = await DatabaseConstant.findOne();

        if (!databaseConstant){
            const newDatabaseConstant = await DatabaseConstant.create({perSuperLikePrice: perSuperLikePrice});
            return res.status(200).send({message: 'Superlike price created successfully', status: 200, constants: newDatabaseConstant})
        }else{
            databaseConstant.perSuperLikePrice = perSuperLikePrice;
            await databaseConstant.save();
            return res.status(200).send({message: 'Superlike price updated successfully', status: 200, constants: databaseConstant})
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error setting superlike price', error: error, status: 500})
    }
}

const getDbConstants = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        
        const databaseConstant = await DatabaseConstant.findOne();
        if (!databaseConstant){ return res.status(200).send({message: 'document not found in database, please set in first from admin panel', status: 200}) }

        return res.status(200).send({message: 'Superlike price fetched successfully', status: 200, getDbConstants: databaseConstant})
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error fetching superlike price', error: error, status: 500})
    }
};

const deleteDbConstants = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        
        const databaseConstant = await DatabaseConstant.findOne();
        if (!databaseConstant){ return res.status(200).send({message: 'document not found in database, please set in first from admin panel', status: 200}) }

        await databaseConstant.deleteOne();

        return res.status(200).send({message: 'Superlike price deleted successfully', status: 200})
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error deleting superlike price', error: error, status: 500})
    }
};

const createPackage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {superlikes, price} = req.body;

    if (!superlikes || isNaN(superlikes)) { return res.status(400).send({message: 'superlikes should be a number', invalidSuperlikes: true, status: 400}) }
    if (!price || isNaN(price)) { return res.status(400).send({message: 'price should be a number', invalidPrice: true, status: 400}) }

    try {
        
        const newPackage = await Package.create({superlikes: superlikes, price: price});
        return res.status(200).send({message: 'Package created successfully', status: 200, package: newPackage})
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error creating package', error: error, status: 500})
    }
}

const getAllPackages = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const packages = await Package.find();
        return res.status(200).send({message: 'Packages fetched successfully', status: 200, packages: packages})
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error fetching packages', error: error, status: 500})
    }
};

const updatePackage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {packageId} = req.params;
    const {superlikes, price} = req.body;

    if (!mongoose.Types.ObjectId.isValid(packageId)) { return res.status(400).send({message: 'Invalid package id', invalidPackageId: true, status: 400}) }
    if (!superlikes || isNaN(superlikes)) { return res.status(400).send({message: 'superlikes should be a number', invalidSuperlikes: true, status: 400}) }
    if (!price || isNaN(price)) { return res.status(400).send({message: 'price should be a number', invalidPrice: true, status: 400}) }

    try {
        
        const packageById = await Package.findById(packageId);
        if (!packageById){ return res.status(400).send({message: 'Package not found', status: 400}) }

        packageById.superlikes = superlikes;
        packageById.price = price;
        await packageById.save();

        return res.status(200).send({message: 'Package updated successfully', status: 200, package: packageById})
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error updating package', error: error, status: 500});
    }
};

const deletePackage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const {packageId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(packageId)) { return res.status(400).send({message: 'Invalid package id', invalidPackageId: true, status: 400}) }

    try {
        
        const packageById = await Package.findById(packageId);
        if (!packageById){ return res.status(400).send({message: 'Package not found', status: 400}) }

        await packageById.deleteOne();

        return res.status(200).send({message: 'Package deleted successfully', status: 200})
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Error deleting package', error: error, status: 500});
    }
};

const adminController = { adminSignup, adminLogin, getAllUsers, switchActiveUser, getUserPosts, getReports, getTransactions, setDbConstant, getDbConstants, createPackage, getAllPackages, updatePackage, deletePackage, deleteDbConstants }
export default adminController