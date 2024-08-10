import mongoose from "mongoose";

const streamSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    username: {type: String, required: true},
    liveID: {type: String, required: true, unique: true},
    isHost: {type: Boolean, required: true},
    profilePic: {type: String, required: true}
},{timestamps: true}
)

export const Stream = mongoose.models.Stream || mongoose.model('Stream', streamSchema)