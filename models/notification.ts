import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
    sender_id: {type: Number, required: true},
    sender_profile: {type: String, required: true},
    receiver_id: {type: Number, required: true},
    title: {type: String, required: true},
    message: {type: String, required: true},
    isRead: {type: Boolean, default: false},
},{timestamps: true})

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)