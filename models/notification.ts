import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
    sender_id: {type: String, required: true},
    sender_profile: {type: String, required: true},
    receiver_id: {type: String, required: true},
    title: {type: String, required: true},
    message: {type: String, required: true},
    isRead: {type: Boolean, default: false},
    type: {type: String, required: false},
},{timestamps: true})

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)