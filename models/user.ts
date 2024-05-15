import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    gender: {type: Number, required: true},   //0, 1, 2
    dob: {type: String, required: true},
    phone: {type: Number, required: false},
    bio: {type: String, required: false},
    preference: {type: String, required: false},
    email_notify: {type: Boolean, default: false},
    avatar: {type: String, required: false},
    signup_questions: {
        type: [{
            question: {type: String, required: true},
            answer: {type: Boolean, required: true}
        }], 
        required: false
    }
})

export const User = models.User || model('User', UserSchema)