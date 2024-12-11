import mongoose, { Schema, model } from "mongoose";

const databaseConstant = new Schema({
    perSuperLikePrice: {type: Number, default: 0.5},
}, {timestamps: true})

export const DatabaseConstant = mongoose.models.databaseConstant || model('DatabaseConstant', databaseConstant)