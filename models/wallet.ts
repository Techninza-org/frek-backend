import { Schema, model, models } from "mongoose";

const walletSchema = new Schema({
    sender: {type: Schema.Types.ObjectId, ref: "User", required: true},
    recipient: {type: Schema.Types.ObjectId, ref: "User", required: true},
    senderName: {type: String, required: false},
    recipientName: {type: String, required: false},
    type: {type: String, required: true},
    amount: {type: Number, required: true},
    createdAt: {type: Date, default: Date.now}
})

export const Wallet = models.Wallet || model('Wallet', walletSchema)