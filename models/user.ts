import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    gender: {type: String, required: true},   
    dob: {type: String, required: true},
    age: {type: Number, required: true},
    pics: {type: [String], required: false},
    phone: {type: Number, required: false},
    bio: {type: String, required: false},
    preference: {type: String, required: false},
    email_notify: {type: Boolean, default: false},
    lat: {type: String, required: false},
    long: {type: String, required: false},
    avatar: {type: String, required: false},
    avatar_updated: {type: Number, default: 0},
    signup_questions: {
        type: [{
            question: {type: String, required: true},
            answer: {type: Boolean, required: true}
        }], 
        required: false
    },
    theme_color: {type: String, default: 'default'},
    last_seen: {type: Date, default: Date.now},
    createdAt: {type: Date, default: Date.now},
    likedBy: {type: [Schema.Types.ObjectId], required: false},
    matched: {type: [Schema.Types.ObjectId], required: false},
    liked: {type: [Schema.Types.ObjectId], required: false}
})

export const User = models.User || model('User', UserSchema)