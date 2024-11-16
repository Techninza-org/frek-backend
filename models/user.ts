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
    preferences: {
        type: [{
            minAge: {type: Number, required: false},
            maxAge: {type: Number, required: false},
            gender: {type: String, required: false},
            area: {type: String, required: false},
        }]
    },
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
    type: {type: String, required: false},
    otp: {type: Number, required: false},
    blocked: {type: [Schema.Types.ObjectId], required: false},
    boughtSuperLikesBalance: {type: Number, default: 5},
    receivedSuperLikesBalance: {type: Number, default: 0},
    isAdmin: {type: Boolean, default: false},
    active: {type: Boolean, default: true},
    reportedBy: {type: [Schema.Types.ObjectId], required: false},
    giftsReceived: {
        type: [{
            giftType: {type: Number, required: true},
            quantity: {type: Number, required: true},
            dateReceived: {type: Date, default: Date.now}
        }],
        required: false
    },
    boughtGifts: {
        type: [{
            giftType: {type: Number, required: true},
            quantity: {type: Number, required: true},
            datePurchased: {type: Date, default: Date.now}
        }],
        required: false
    },
    walletBalance: {type: Number, default: 0},
    customActiveStatus: {type: Number, default: 2, required: false, enum: [1, 2, 3], min: 1, max: 3}, // 1: online, 2: offline, 3: away
})

export const User = models.User || model('User', UserSchema)