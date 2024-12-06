import mongoose from "mongoose";

const streamGroupSchema = new mongoose.Schema({
    hostUserId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    hostUsername: {type: String, required: false},
    hostProfilePic: {type: String, required: false},
    streamGroupId: {type: String, required: false},
    coHostUserIds: {type: [mongoose.Schema.Types.ObjectId], ref: "User", required: false},
    connectedUsers: {type: [mongoose.Schema.Types.ObjectId], ref: "User", required: false},
    bouncerUserIds: {type: [mongoose.Schema.Types.ObjectId], ref: "User", required: false},
    streamRequestUserIds: {type: [mongoose.Schema.Types.ObjectId], ref: "User", required: false},
    isLive: {type: Boolean, default: true},
    agoraStreamId: {type: String, required: false},
}, {timestamps: true});

export const StreamGroup = mongoose.models.StreamGroup || mongoose.model('StreamGroup', streamGroupSchema)