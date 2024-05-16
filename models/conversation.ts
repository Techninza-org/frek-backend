import mongoose, { Schema, model } from "mongoose";

const conversationSchema = new Schema({
    participants: {type: [Schema.Types.ObjectId], ref: "User", required: true},
    messages: {type: [Schema.Types.ObjectId], ref: "Message", required: false},
}, {timestamps: true})

export const Conversation = mongoose.models.conversationSchema || model('Conversation', conversationSchema)