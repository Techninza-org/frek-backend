import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: false},
    gender: {type: String, required: false},   
    dob: {type: String, required: false},
    age: {type: Number, required: false},
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
            question: {type: String, required: false},
            answer: {type: String, required: false}
        }], 
        required: false
    },
    theme_color: {type: String, default: 'default'},
    bubble_color: {type: String, default: 'default'},
    last_seen: {type: Date, default: Date.now},
    createdAt: {type: Date, default: Date.now},
    likedBy: {type: [Schema.Types.ObjectId], required: false},
    matched: {type: [Schema.Types.ObjectId], required: false},
    liked: {type: [Schema.Types.ObjectId], required: false},
    disliked: {type: [Schema.Types.ObjectId], required: false},
    registrationToken: {type: String, required: false},
    type: {type: String, required: false}
})

export const User = models.User || model('User', UserSchema)