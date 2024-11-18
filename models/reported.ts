import { Schema, model, models } from "mongoose";

const reportedSchema = new Schema({
    reporter: {type: Schema.Types.ObjectId, ref: "User", required: true}, // who report the user
    reported: {type: Schema.Types.ObjectId, ref: "User", required: true}, // The user who is reported by user
    reason: {type: String, default: null},
    createdAt: {type: Date, default: Date.now}
}, {timestamps: true});

export const Reported = models.Reported || model('Reported', reportedSchema)