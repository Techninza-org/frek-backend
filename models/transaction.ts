import { Schema, model, models } from "mongoose";

const transactionSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: "User", required: true},
    type: {type: String, required: false},
    quantity: {type: String, required: false},
    amount: {type: Number, required: true},
    status: {type: String, required: false},
    currency: {type: String, required: false},
    orderId: {type: String, required: false},
    createdAt: {type: Date, default: Date.now}
})

export const Transaction = models.Transaction || model('Transaction', transactionSchema)