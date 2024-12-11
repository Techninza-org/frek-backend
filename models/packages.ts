import mongoose, {Schema, model} from "mongoose";

const packageSchema = new Schema({
    superlikes: {type: Number, required: true},
    price: {type: Number, required: true},

}, {timestamps: true});

export const Package = mongoose.models.Package || model('Package', packageSchema)

