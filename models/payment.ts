import { Schema, model, models } from "mongoose";

const paymentSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    amount: {type: Number, required: true},
    status: {type: String, required: true},
    paymentId: {type: String, required: true},
    createdAt: {type: Date, default: Date.now}
})

export const Payment = models.Payment || model('Payment', paymentSchema)