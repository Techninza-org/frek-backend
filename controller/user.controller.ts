import { Response, NextFunction } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { User } from "../models/user"
import helper from "../utils/helpers"
import { Notification } from "../models/notification"
import { Payment } from "../models/payment"
import { Wallet } from "../models/wallet"
import { sendNotif } from "../app"
import mongoose from "mongoose"
import { Reported } from "../models/reported"
import { Transaction } from "../models/transaction"

// import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from "agora-access-token";
import { StreamGroup } from "../models/streamGroup"
import { DatabaseConstant } from "../models/databaseConstant"
import { Package } from "../models/packages"

import { RtcTokenBuilder, Role } from "../utils/RtcTokenBuilder2"

const getUserDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    //update last seen 
    const user = req.user
    if(!user) return res.status(400).send({message: 'User not found'})
    user.last_seen = new Date()
    await user.save()
    user.password = undefined
    user.liked = undefined
    user.blocked = undefined
    user.matched = undefined
    user.reportedBy = undefined

    if(user.boughtGifts.length > 0){

        //set latest price for each gift type (just for response, do not store it in db)
        const priceOfGiftTypeZero = 10;
        const priceOfGiftTypeOne = 20;
        const priceOfGiftTypeTwo = 30;
        const priceOfGiftTypeThree = 40;
        const priceOfGiftTypeFour = 50;
        const priceOfGiftTypeFive = 60;

        for(let i = 0; i < user.boughtGifts.length; i++){
            switch(user.boughtGifts[i].giftType){
                case 0:
                    user.boughtGifts[i].pricePerQty = priceOfGiftTypeZero;
                    break;
                case 1:
                    user.boughtGifts[i].pricePerQty = priceOfGiftTypeOne;
                    break;
                case 2:
                    user.boughtGifts[i].pricePerQty = priceOfGiftTypeTwo;
                    break;
                case 3:
                    user.boughtGifts[i].pricePerQty = priceOfGiftTypeThree;
                    break;
                case 4:
                    user.boughtGifts[i].pricePerQty = priceOfGiftTypeFour;
                    break;
                case 5:
                    user.boughtGifts[i].pricePerQty = priceOfGiftTypeFive;
                    break;
            }
        }

        return res.status(200).send({valid: true, user: user })
    }
    return res.status(200).send({valid: true, user: user })
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
        updatedUser.password = undefined
        updatedUser.liked = undefined
        updatedUser.blocked = undefined
        updatedUser.matched = undefined
        updatedUser.reportedBy = undefined
        return res.status(200).send({message: 'User details updated successfully', user: updatedUser})
        
    }catch(err){
        return next(err)
    }
}

const signupQuestions = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
    const user = req.user
    const {questions} = req.body
    if(!questions) {
        return res.status(400).send({message: 'Questions required'})
    }
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
    catch(err){
        return next(err)
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

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const userIdToExclude = [...user.liked, ...user.matched, ...user.disliked, ...user.blocked, user._id]
        
        const userPreferences = user.preferences[0] ? user.preferences[0] : false;

        const users = await User.find({ _id: { $nin: userIdToExclude }, age: {$gt: userPreferences.minAge || 18, $lt: userPreferences.maxAge || 40 }, gender: (userPreferences.gender).toLowerCase() || 'male' });

        console.log("userPreferences: ", userPreferences);

        console.log("users length", users.length);

        // users.filter(user => !user.matched.includes(req.user._id) && !user.liked.includes(req.user._id) && !user.disliked.includes(req.user._id))

        users.sort(() => Math.random() - 0.5)

        const paginatedUsers = users.slice(startIndex, endIndex);
        const feed = paginatedUsers.map(user => ({id: user._id, name: user.name, age: user.age, avatar: user.avatar}))

        const totalUsers = users.length;
        const totalPages = Math.ceil(totalUsers / limit);

        return res.status(200).send({feed: feed, totalPages: feed, totalCountUser: feed.length});
    }catch(error){
        return res.status(400).send({message: 'Error fetching feed', error: error})
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
        const id = req.params.id
        if (!id) return res.status(400).send({message: 'Notification id is required'})
        if(!user) return res.status(400).send({message: 'User not found'})
        const isNotif = await Notification.findById(id)
        if(!isNotif) return res.status(400).send({message: 'Notification not found'})
        const notif = await Notification.findByIdAndUpdate(id, {isRead: true}, {new: true})
        return res.status(200).send({message: 'Notification marked as read', notification: notif})
    }catch(err){
        return res.status(400).send({message: 'Error marking notification as read'})
    }
}

const deleteNotification = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const id = req.params.id
        if(!id) return res.status(400).send({message: 'Notification id is required'})
        if(!user) return res.status(400).send({message: 'User not found'})
        const isNotif = await Notification.findById(id)
        if(!isNotif) return res.status(400).send({message: 'Notification not found'})
        const notif = await Notification.findByIdAndDelete(id)
        return res.status(200).send({message: 'Notification deleted', notification: notif})
    }catch(err){
        return res.status(400).send({message: 'Error deleting notification'})
    }
}

const addPayment = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {amount, status, paymentId} = req.body
        if(!user) return res.status(400).send({message: 'User not found'})
        const payment = await Payment.create({user: user._id, amount, status, paymentId})
        return res.status(200).send({message: 'Payment added successfully', payment})
    }catch(err){
        console.log(err);
        return res.status(400).send({message: 'Error adding payment'})
    }
}

const paymentHistory = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        const payments = await Payment.find({user: user._id}).sort({createdAt: -1})
        return res.status(200).send({payments})
    }catch(err){
        return res.status(400).send({message: 'Error fetching payment history'})
    }
}

const blockUserById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {id} = req.params
        if(!id) return res.status(400).send({message: 'User id is required'})
        if(!user) return res.status(400).send({message: 'User not found'})
        const userToBlock = await User.findById(id)
        if(!userToBlock) return res.status(400).send({message: 'User to block not found'})
        if(user.blocked.includes(userToBlock._id)){
            return res.status(400).send({message: 'User already blocked'})
        }
        user.blocked.push(userToBlock._id)
        await user.save()
        return res.status(200).send({message: 'User blocked successfully'})
    }catch(err){
        return res.status(400).send({message: 'Error blocking user'})
    }
}

const blockedUserList = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({status: 400, message: 'User not found'})
        const blockedUsers = await User.find({_id: {$in: user.blocked}})
    const simplifiedBlockedUsers = blockedUsers.map(user => ({id: user._id,avatar: user.avatar, name: user.name}));
    return res.status(200).send({status: 200, blockedUsers: simplifiedBlockedUsers});
    }catch(err){
        return res.status(400).send({status: 400, message: 'Error fetching blocked users'})
    }
}

const unblockUserById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {id} = req.params
        if(!id) return res.status(400).send({status: 400, message: 'User id is required'})
        if(!user) return res.status(400).send({status: 400, message: 'User not found'})
        const userToUnblock = await User.findById(id)
        if(!userToUnblock) return res.status(400).send({status: 400, message: 'User to unblock not found'})
        if(!user.blocked.includes(userToUnblock._id)){
            return res.status(400).send({status: 400, message: 'User not blocked'})
        }
        user.blocked = user.blocked.filter((blockedUser: any) => blockedUser.toString() !== userToUnblock._id.toString())
        await user.save()
        return res.status(200).send({status: 200, message: 'User unblocked successfully'})
    }catch(err){
        return res.status(400).send({status: 400, message: 'Error unblocking user'})
    }
}

const reportUserById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        const {id} = req.params
        const { reason } = req.body;
        console.log(reason);
        console.log(req.body, 'body');
        
        

        if(reason){
            if (typeof reason !== 'string') { return res.status(400).json({status: 400, message: 'Reason for report should be a string'}) }
            if (reason.trim().length < 1) { return res.status(400).json({status: 400, message: 'Reason for report should not be empty'}) }
            if (reason.trim().length > 1000) { return res.status(400).json({status: 400, message: 'Reason for report should not exceed 1000 characters'}) }
        }

        if(!id) return res.status(400).send({message: 'User id is required'})
        if(!user) return res.status(400).send({message: 'User not found'})
        const userToReport = await User.findById(id)
        if(!userToReport) return res.status(400).send({message: 'User to report not found'})
        if(userToReport.reportedBy.includes(user._id)){
            return res.status(400).send({status: 400, message: 'User already reported'})
        }
        userToReport.reportedBy.push(user._id)
        await userToReport.save()

        const reportUser = await Reported.create({reporter: user._id, reported: userToReport._id, reason: reason})
        await user.save()
        return res.status(200).send({ status: 200, message: 'User reported successfully'})
    }catch(err){
        return res.status(400).send({status: 500, message: 'Error blocking user'})
    }
}

const sendSuperLike = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { recipientId, superlikeCount } = req.body;

    if (superlikeCount > 10) {
        return res.status(400).json({ message: 'Cannot send more than 10 superlikes at once.' });
    }

    try {
        const sender = req.user;
        const senderId = req.user._id;

        const receiver = await User.findById(recipientId);
        if(!receiver) {
            return res.status(400).json({ message: 'Recipient not found.' });
        }

        if (sender.boughtSuperLikesBalance < superlikeCount) {
            return res.status(400).json({error: 'Insufficient balance', message: 'Insufficient superlike balance.' });
        }

        // Deduct superlike balance from the sender
        sender.boughtSuperLikesBalance -= superlikeCount;
        await sender.save();

        receiver.receivedSuperLikesBalance += superlikeCount;
        await receiver.save();

        // Record transaction in the Wallet collection
        const walletTransaction = await Wallet.create({
            sender: senderId,
            recipient: recipientId,
            senderName: sender.name,
            recipientName: receiver.name,
            type: 'superlike',
            amount: superlikeCount,
            dateSent: new Date(),
        });

        sendNotif(senderId, recipientId, req.user.avatar, 'New Superlike', `${req.user.name} has Superliked you`, 'Event')

        res.status(200).json({status: 200, message: `${superlikeCount} superlikes sent to ${receiver.name}.`, transaction: walletTransaction });
    } catch (error) {
        res.status(500).json({ status: 500, message: 'Failed to send superlikes.', error });
    }
};

const getWalletTransactionByDate = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { date } = req.query;

    try {
        const user = req.user;
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0); 
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999); 
    
        if(date){
        startDate = new Date(date as string);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date as string);
        endDate.setHours(23, 59, 59, 999); 
        }

        // Find transactions where the user is the sender
        const sentTransactions = await Wallet.find({
            sender: user._id,
            createdAt: { $gte: startDate, $lt: endDate },
        }).populate('recipient', 'name'); // Assuming `username` is the field for recipient's name

        // Find transactions where the user is the recipient
        const receivedTransactions = await Wallet.find({
            recipient: user._id,
            createdAt: { $gte: startDate, $lt: endDate },
        }).populate('sender', 'name'); // Assuming `username` is the field for sender's name

        // Format the response with custom messages
        const transactions = {
            sent: sentTransactions.map(tx => ({
                _id: tx._id,
                message: `You sent ${tx.recipient.name} ${tx.amount} superlike${tx.amount > 1 ? 's' : ''}.`,
                type: tx.type,
                amount: tx.amount,
                createdAt: tx.createdAt,
            })),
            received: receivedTransactions.map(tx => ({
                _id: tx._id,
                message: `${tx.sender.name} sent you ${tx.amount} superlike${tx.amount > 1 ? 's' : ''}.`,
                type: tx.type,
                amount: tx.amount,
                createdAt: tx.createdAt,
            })),
        };

        const sorted_transacs = [...transactions.sent, ...transactions.received].sort((a, b) => b.createdAt - a.createdAt);

        res.status(200).json({ status: 200, sorted_transacs, wallet_balance: user.walletBalance });
    } catch (error) {
        res.status(500).json({ status: 400, message: 'Failed to fetch wallet transactions.', error });
    }
};


const buySuperLikes = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { superlikeCount, cost } = req.body;

    if(!superlikeCount || !cost) {
        return res.status(400).json({ message: 'Superlike count and cost are required.' });
    }

    try {
        const user = req.user;
        user.boughtSuperLikesBalance += superlikeCount;
        await user.save();

        res.status(200).json({ status:200, message: `${superlikeCount} superlikes bought successfully.` });
    } catch (error) {
        res.status(500).json({ status: 500, error: 'Failed to buy superlikes.' });
    }
}

const getSuperlikeOffers = async (
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
    //   const offers = [
    //     { id: 1, superlikes: 4000, price: 30 },
    //     { id: 2, superlikes: 6000, price: 50 },
    //     { id: 3, superlikes: 9000, price: 80 },
    //   ];

    const offers = await Package.find().sort({ price: -1 });

    const mostExpensivePackage = offers[0];

    const databaseConstant = await DatabaseConstant.findOne();
    const pricePerSuperLike = databaseConstant.perSuperLikePrice || (mostExpensivePackage.price / mostExpensivePackage.superlikes);

      console.log(`databsePerSuperLikePrice: ${databaseConstant.perSuperLikePrice} | static mostExpensivePacakeSuperLikePrice: ${mostExpensivePackage.price / mostExpensivePackage.superlikes}`);
    //   return res.status(200).send({ message: "Superlike offers", offers });
      return res.status(200).send({ message: "Superlike offers", offers: offers, pricePerSuperLike: pricePerSuperLike });
    } catch (err) {
      return next(err);
    }
  };

const updatePreferences = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { minAge, maxAge, gender, area } = req.body;

        user.preferences = [{
            minAge: minAge || user.preferences[0].minAge,
            maxAge: maxAge || user.preferences[0].maxAge,
            gender: gender || user.preferences[0].gender,
            area: area || user.preferences[0].area,
        }];

        await user.save();

        return res.status(200).send({ message: 'Preferences updated successfully', preferences: user.preferences });
    } catch (err) {
        return res.status(400).send({ message: 'Error updating preferences' });
    }
}

const getGiftsTypes = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const gifts = [
            { id: 0, name: 'Gift 1', price: 10 },
            { id: 1, name: 'Gift 2', price: 20 },
            { id: 2, name: 'Gift 3', price: 30 },
            { id: 3, name: 'Gift 4', price: 40 },
            { id: 4, name: 'Gift 5', price: 50 },
            { id: 5, name: 'Gift 6', price: 60 },
            { id: 6, name: 'Gift 7', price: 70 },
        ];

        return res.status(200).send({ status:200, message: 'Gift types', gifts });
    } catch (err) {
        return res.status(400).send({ status:400, message: 'Error fetching gift types' });
    }
}

const buyGift = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { gifts } = req.body; 

    const giftPrices = [10, 20, 30, 40, 50, 60, 70];

    if (
        !Array.isArray(gifts) || 
        gifts.some(g => 
            typeof g.giftType !== 'number' || 
            g.giftType < 0 || 
            g.giftType > 6 || 
            typeof g.quantity !== 'number' || 
            g.quantity <= 0
        )
    ) {
        return res.status(400).json({ status: 400, message: 'Invalid gift types or quantities.' });
    }

    try {
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 404, message: 'User not found.' });
        }

        let totalCost = 0;

        gifts.forEach(gift => {
            const { giftType, quantity } = gift;
            const giftPrice = giftPrices[giftType];
            const cost = giftPrice * quantity;
            totalCost += cost;

            const purchasedGift = user.boughtGifts.find((g: { giftType: any }) => g.giftType === giftType);
            if (purchasedGift) {
                purchasedGift.quantity += quantity;
            } else {
                // user.boughtGifts.push({ giftType, quantity });
                user.boughtGifts.push({ giftType: giftType, quantity: quantity, pricePerQty: giftPrices[giftType] });
            }
        });

        await user.save();
        const giftsBought = user.boughtGifts

        res.status(200).json({
            status: 200,
            message: 'Gifts bought successfully.',
            totalCost,
            giftsBought,
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: 'Failed to buy gifts.', error });
    }
};


const sendGift = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { recipientId, giftType } = req.body;

    // Define gift values
    const giftValues = [10, 20, 30, 40, 50, 60, 70]; // index corresponds to giftType 0-5
    const giftValue = giftValues[giftType];

    if (giftType < 0 || giftType > 6) {
        return res.status(400).json({status:400, message: 'Invalid gift type.' });
    }

    try {
        const sender = req.user;
        const senderId = req.user._id;

        // Find the recipient
        const receiver = await User.findById(recipientId);
        if (!receiver) {
            return res.status(400).json({status:400, message: 'Recipient not found.' });
        }

        // Check if the sender has bought the gift
        const hasPurchasedGift = await checkGiftPurchase(senderId, giftType, 1); // Placeholder for API call or DB check
        if (!hasPurchasedGift) {
            return res.status(400).json({ status:400, message: 'Gift not purchased or insufficient quantity available.' });
        }

        // Update recipient's balance
        receiver.receivedGiftsBalance += giftValue;
        receiver.walletBalance += giftValue;
        await receiver.save();

        // Record transaction in the Wallet collection
        const walletTransaction = await Wallet.create({
            sender: senderId,
            recipient: recipientId,
            senderName: sender.name,
            recipientName: receiver.name,
            type: 'gift',
            giftType,
            amount: giftValue,
        });

        sendNotif(senderId, recipientId, sender.avatar, 'New Gift', `${sender.name} has sent you a gift`, 'Event');

        res.status(200).json({
            status: 200,
            message: `Gifts of $${giftValue} each sent to ${receiver.name}. Total: $${giftValue}.`,
            transaction: walletTransaction,
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: 'Failed to send gift.', error });
    }
};

const checkGiftPurchase = async (senderId: any, giftType: any, quantity: number) => {
    try {
        // Find the user by senderId
        const user = await User.findById(senderId);

        if (!user) {
            console.error('User not found');
            return false;
        }

        // Find the purchased gift record for the specified gift type
        const purchasedGift = user.boughtGifts.find((gift: { giftType: any }) => gift.giftType === giftType);

        // Check if the purchased gift exists and has enough quantity
        if (purchasedGift && purchasedGift.quantity >= quantity) {
            // Update the quantity in the database to reflect the used quantity
            purchasedGift.quantity -= quantity;
            await user.save();

            return true;
        } else {
            return false; // Not enough quantity available
        }
    } catch (error) {
        console.error('Error checking gift purchase:', error);
        return false;
    }
};

const updateCustomActiveStatus = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { customActiveStatus } = req.body;

    if (typeof customActiveStatus !== 'number') {return res.status(400).json({ status: 400, message: 'status should be number'});}
    if (customActiveStatus < 1 || customActiveStatus > 3) {return res.status(400).json({ status: 400, message: 'status should be 0 between 3'});}

    try {
        
        // const userId = req.user._id;
        // const user = await User.findById(userId);

        const user = req.user;
        console.log("user_id: ", user._id);


        user.customActiveStatus = customActiveStatus;
        await user.save();

        return res.status(200).json({ status: 200, message: 'User active status updated successfully.', active: user.customActiveStatus });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, message: 'Failed to update active status.', error });
    }
};

const getCustomActiveStatusByUserId = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {return res.status(400).json({ status: 400, message: 'Invalid user ID' });}

    try {
        
        const user = await User.findById(userId);
        if (!user) {return res.status(404).json({ status: 404, message: 'User not found' });}

        let customAcitveStatus = user.customActiveStatus;

        return res.status(200).json({ status: 200, customAcitveStatus: customAcitveStatus });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, message: 'Failed to get active status.', error });
    }
};

const uploadImage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const user = req.user
        if(!user) return res.status(400).send({message: 'User not found'})
        
        if(!req.file) return res.status(400).send({message: 'Please upload an image'})
        const fileUrl = helper.imageUrlGen(req.file)
        return res.status(200).send({status: 200, message: 'File Uploaded Successfully', file: fileUrl})
    }catch(err){
        return res.status(400).send({message: 'Error updating user avatar'})
    }
}

const createTransaction = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{    
        const {amount, type, quantity, status, currency, orderId} = req.body
        if(!amount || !type || !quantity || !status || !currency || !orderId) return res.status(400).send({message: 'All fields are required'})
        const transaction = await Transaction.create({
            userId: req.user._id,
            amount, type, quantity, status, currency, orderId
        })
        return res.status(200).send({status: 200, message: "Transaction created successfully", transaction})

    }catch(err){
        return res.status(400).send({message: 'Error creating transaction'})
    }
}

const getTransactionByDate = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { startDate: start, endDate: end } = req.query;

    try {
        const user = req.user;

        let startDate: Date, endDate: Date;

        if (start && end) {
            startDate = new Date(start as string);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(end as string);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of the current month
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of the current month
        }

        const transactions = await Transaction.find({
            userId: user._id,
            createdAt: { $gte: startDate, $lt: endDate },
        });

        res.status(200).json({ status: 200, data: transactions });
    } catch (error) {
        res.status(500).json({ status: 400, message: 'Failed to fetch transactions.', error });
    }
};

//===========

//get rtc token

const getRtcToken = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { channelName, uid, role = "PUBLISHER", tokenExpiration = 3600 } = req.body;
    const user = req.user;
    const previlegeExpireTime = 3600;

    //============
    const channelName1 = '7d72365eb983485397e3e3f9d460bdda'
    const staticUid = 0
    const account = '2882341273'
    const role1 = Role.PUBLISHER
    const tokenExpirationInSecond = 3600
    const privilegeExpirationInSecond = 3600
    const joinChannelPrivilegeExpireInSeconds = 3600
    const pubAudioPrivilegeExpireInSeconds = 3600
    const pubVideoPrivilegeExpireInSeconds = 3600
    const pubDataStreamPrivilegeExpireInSeconds = 3600
    //============
  
    // Validate input
    // if (!channelName || uid == null) {return res.status(400).json({ error: "channelName and uid are required" });}
    if (!channelName) {return res.status(400).json({ error: "channelName is required" });}
  
    const appId = process.env.AGORA_APP_ID || '0ad2acf092ca4c088f5f00e41e170286';
    const appCertificate = process.env.AGORA_APP_CERTIFICATE || 'c8300f5918aa498b90cbd74c880022c0';
  
    if (!appId || !appCertificate) {
      return res.status(500).json({ error: "AGORA_APP_ID or AGORA_APP_CERTIFICATE not set in environment variables" });
    }
  
    // Set role
    // const rtcRole = role === "SUBSCRIBER" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const rtcRole = role === "SUBSCRIBER" ? Role.SUBSCRIBER : Role.PUBLISHER;

    console.log(`appId: ${appId}, appCertificate: ${appCertificate}, channelName: ${channelName}, staticUid: ${staticUid}, rtcRole: ${rtcRole}, tokenExpiration: ${tokenExpiration}, previlegeExpireTime: ${previlegeExpireTime}`)
  
    try {

        if(!user) { return res.status(400).send({message: 'User not found'}) };

        // if (!user.rtcToken) {
        console.log("user rtc token: ", user.rtcToken)

        let rtcTokenByChannelName = 'notFoundToken';

        const isRtcTokenAvailableByChannelNameOverAllUsers = await User.findOne({
            rtcToken: {
                $elemMatch: {channelName: channelName}
            }
        })

        if (isRtcTokenAvailableByChannelNameOverAllUsers){

            console.log("inside if rtc token is available in all-users-object")

            for (let i = 0 ; i < isRtcTokenAvailableByChannelNameOverAllUsers.rtcToken.length; i++ ){
                if (isRtcTokenAvailableByChannelNameOverAllUsers.rtcToken[i].channelName === channelName){
                    rtcTokenByChannelName = isRtcTokenAvailableByChannelNameOverAllUsers.rtcToken[i].token;
                    break;
                }
            }

            return res.status(200).json({ token: rtcTokenByChannelName });
        }

        const isRtcTokenPresent = user.rtcToken.find((x: any) => x.channelName === channelName);
        if (!isRtcTokenPresent) { // 

            console.log("inside if rtc not present in user object")

            console.log(`appId: ${appId}, appCertificate: ${appCertificate}, channelName: ${channelName}, staticUid: ${staticUid}, rtcRole: ${rtcRole}, tokenExpiration: ${tokenExpiration}`)

            const token = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                // channelName1,
                // uid,
                staticUid,
                rtcRole,
                // role1,
                tokenExpiration * 24,
                privilegeExpirationInSecond * 24 // addedLater
            );

            // user.rtcToken = { token: token, channelName: channelName };
            user.rtcToken.push({ token: token, channelName: channelName });

            await user.save();

            return res.json({ token: token });
        }

        // if (user.rtcToken) {
        if (isRtcTokenPresent) {

            console.log("inside if rtc is present in user object")

            //getting index of the channelName in the array
            let index = user.rtcToken.findIndex((x: any) => x.channelName === channelName);
            
            if (user.rtcToken[index].createdAt + ( 3600 *24 ) < Date.now()) { // if token is older than 24 hours 

                console.log("inside if rtc is present in user object and is older than 24 hours")

                // const token = RtcTokenBuilder.buildTokenWithUid(
                //     appId,
                //     appCertificate,
                //     channelName,
                //     uid,
                //     rtcRole,
                //     tokenExpiration
                // );

                const token = RtcTokenBuilder.buildTokenWithUid(
                    appId,
                    appCertificate,
                    channelName,
                    // channelName1,
                    // uid,
                    staticUid,
                    rtcRole,
                    // role1,
                    tokenExpiration * 24,
                    privilegeExpirationInSecond * 24 // addedLater
                );
                
                // user.rtcToken = {token: token, channelName: channelName};
                user.rtcToken[index] = {token: token, channelName: channelName};
                await user.save();

                return res.json({ token: token });
            } else {

                console.log("inside if rtc is present in user object and is -not- older than 24 hours")
                return res.status(200).json({ token: user.rtcToken[index].token });
            }
        }
    } catch (err) {
      console.error("Error generating token:", err);
      return res.status(500).json({ error: "Failed to generate token" });
    }
}

// get streamGroup of all liked users (live streamGroups)
const getLikedUsersStreamGroups = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const loggedInUser = req.user;

    try {
        
        if (!loggedInUser) { return res.status(400).send({message: 'logged-in User not found'}) };

        console.log("loggedInuserid: ", loggedInUser._id)

        const likedUsersIdsArray = loggedInUser.liked;
        const matchedUserIdsArray = loggedInUser.matched;

        const mergedArray = likedUsersIdsArray;

        console.log(" likedUsersIdsArray: ", likedUsersIdsArray);
        console.log(" mergedArray: ", mergedArray);
        
        if (matchedUserIdsArray.length > 0) {
            for (let i = 0; i < matchedUserIdsArray.length; i++) {
                if (!mergedArray.includes(matchedUserIdsArray[i])) {
                    mergedArray.push(matchedUserIdsArray[i]);
                }
            }
        }

        const streamByHostId = await StreamGroup.find({ hostUserId: '675199f28f944ebe7bbabde7' });
        console.log("streamByHostId: ", streamByHostId);


        // get all live streamGroups of liked users
        // const streamGroups = await StreamGroup.find({ hostUserId: { $in: likedUsersIdsArray }, isLive: true });
        const streamGroups = await StreamGroup.find({ hostUserId: { $in: mergedArray }, isLive: true });

        return res.status(200).json({ status: 200, streamGroups: streamGroups });
    } catch (error) {
        console.log("error: ", error);
        res.status(500).json({ status: 500, message: 'Failed to fetch liked users stream groups.', error: error });
    }
}

const userController = {getUserDetails, createTransaction, getTransactionByDate, uploadImage, signupQuestions, updateUserDetails, deleteUser, getFeed, getMatchedUsers, uploadPics, getNotifications, markAsRead, deleteNotification, addPayment, paymentHistory, blockUserById, sendSuperLike, getWalletTransactionByDate, buySuperLikes, getSuperlikeOffers, updatePreferences, reportUserById, sendGift, buyGift, blockedUserList, unblockUserById, getGiftsTypes, updateCustomActiveStatus, getCustomActiveStatusByUserId, getRtcToken, getLikedUsersStreamGroups}
export default userController