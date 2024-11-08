import { Response, NextFunction } from "express"
import { ExtendedRequest } from "../utils/middleware"
import { User } from "../models/user"
import helper from "../utils/helpers"
import { Notification } from "../models/notification"
import { Payment } from "../models/payment"
import { Wallet } from "../models/wallet"
import { sendNotif } from "../app"

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
        return res.status(200).send({status: 200, blockedUsers})
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
        if(!id) return res.status(400).send({message: 'User id is required'})
        if(!user) return res.status(400).send({message: 'User not found'})
        const userToReport = await User.findById(id)
        if(!userToReport) return res.status(400).send({message: 'User to report not found'})
        if(userToReport.reportedBy.includes(user._id)){
            return res.status(400).send({status: 400, message: 'User already reported'})
        }
        userToReport.reportedBy.push(user._id)
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

        res.status(200).json({ status: 200, transactions });
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
      const offers = [
        { id: 1, superlikes: 4000, price: 30 },
        { id: 2, superlikes: 6000, price: 50 },
        { id: 3, superlikes: 9000, price: 80 },
      ];
      return res.status(200).send({ message: "Superlike offers", offers });
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


const buyGift = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { giftType, quantity } = req.body;

    // Define gift prices
    const giftPrices = [10, 20, 30, 40, 50]; // Prices for gift types 0-4
    const giftPrice = giftPrices[giftType];

    // Validate gift type and quantity
    if (giftType < 0 || giftType > 4) {
        return res.status(400).json({ status:400,message: 'Invalid gift type.' });
    }
    if (quantity <= 0) {
        return res.status(400).json({status:400, message: 'Quantity must be greater than zero.' });
    }

    try {
        const userId = req.user._id;

        // Calculate the total cost of the purchase
        const totalCost = giftPrice * quantity;

        // Retrieve the user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({status:400, message: 'User not found.' });
        }

        // Check if the user has enough balance
        // if (user.balance < totalCost) {
        //     return res.status(400).json({ message: 'Insufficient balance to buy gifts.' });
        // }

        // Deduct the cost from the user's balance
        // user.balance -= totalCost;

        // Find or add the purchased gift in the user's boughtGifts array
        const purchasedGift = user.boughtGifts.find((gift: { giftType: any }) => gift.giftType === giftType);
        if (purchasedGift) {
            // Update the quantity if the gift type already exists
            purchasedGift.quantity += quantity;
        } else {
            // Add a new gift entry if it doesn't exist
            user.boughtGifts.push({ giftType, quantity });
        }

        // Save the updated user
        await user.save();

        res.status(200).json({
            status: 200,
            message: `${quantity} gifts of type ${giftType} bought successfully. Total cost: $${totalCost}.`,
            user,
        });
    } catch (error) {
        console.error('Error buying gift:', error);
        res.status(500).json({ status: 500, message: 'Failed to buy gift.', error });
    }
};

const sendGift = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const { recipientId, giftType } = req.body;

    // Define gift values
    const giftValues = [10, 20, 30, 40, 50]; // index corresponds to giftType 0-4
    const giftValue = giftValues[giftType];

    if (giftType < 0 || giftType > 4) {
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

        // Calculate the total value of the gift
        // const totalGiftValue = giftValue * quantity;

        // Update recipient's balance
        // receiver.receivedGiftsBalance += totalGiftValue;
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


const userController = {getUserDetails, signupQuestions, updateUserDetails, deleteUser, getFeed, getMatchedUsers, uploadPics, getNotifications, markAsRead, deleteNotification, addPayment, paymentHistory, blockUserById, sendSuperLike, getWalletTransactionByDate, buySuperLikes, getSuperlikeOffers, updatePreferences, reportUserById, sendGift, buyGift, blockedUserList, unblockUserById}
export default userController