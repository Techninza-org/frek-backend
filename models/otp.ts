import { Schema, model, models } from "mongoose";

const otpSchema = new Schema({
    phone: {type: Number, required: false},
    countryPhoneCode: {type: Number, required: false},
    email: {type: String, required: false},
    otp: {type: Number, required: true},
    otpType: {type: Number, required: true},  // 1: signup, 2: update
    expiry: {type: Date, default: Date.now, expires: 600}, // 10 minutes
}, {timestamps: true});

export const Otp = models.Otp || model('Otp', otpSchema)