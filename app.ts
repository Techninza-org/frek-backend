import express from "express"
import cors from 'cors'
import mongoose from "mongoose"
import dotenv from 'dotenv'
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import middleware from "./utils/middleware"
import actionRouter from "./routes/action.routes"
import messageRouter from "./routes/message.routes"
import path from "path";
import { Stripe } from "stripe"
import fs from "fs";
import streamRouter from "./routes/stream.routes";
import { Notification } from "./models/notification";
import * as admin from 'firebase-admin'
import { User } from "./models/user";
dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())
app.use('/public', express.static(path.join(__dirname, 'public')));


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    })

    console.log('Firebase Admin initialized successfully.')
} catch (error) {
    console.error('Error initializing Firebase Admin:', error)
}

const stripe = new Stripe('sk_test_51PzcN8P42SraKXdKdAD7cqNY3OT84LAArOn8PcwOKvN7Sv7Lwk4I3BREqVwpPFJkLIqOUVC4o5m1UgRslnjZaSmc00Zln9LoDQ');

export const getReceiverSocketId = (receiverId: string) => {
    return userSocketMap[receiverId]
}

const userSocketMap: { [key: string]: string } = {};

app.get('/ping', (req, res) => {
    return res.status(200).send({message: 'pong'})
})

app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency } = req.body;
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount, 
            currency,
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/', (req, res) => res.send('Server running...'))

app.use('/auth', authRouter)
//@ts-ignore
app.use('/user', middleware.AuthMiddleware, userRouter)
//@ts-ignore
app.use('/action', middleware.AuthMiddleware, actionRouter)
//@ts-ignore
app.use('/message', middleware.AuthMiddleware, messageRouter)

app.use('/stream', streamRouter)

export const sendNotif = async (
    senderId: string,
    receiverId: string,
    senderProfile: string,
    title: string,
    message: string
) => {
    try {
        const notif = await Notification.create({
            sender_id: senderId,
            receiver_id: receiverId,
            sender_profile: senderProfile,
            title: title,
            message: message,
        });

        console.log('Notification created:', notif);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};


export const sendNotification = async (registrationToken: string, payload: { title: string; body: string }) => {
    try {
        const message = {
            token: registrationToken,
            notification: {
                title: payload.title,
                body: payload.body,
            },
        }

        const response = await admin.messaging().send(message)
        console.log('Successfully sent message:', response)
        return response
    } catch (error) {
        console.error('Error sending message:', error)
    }
}

export const getUserToken = async (userId: any) => {
    console.log('Getting user token:', userId);
    const user = await User.findById({ where: { _id: userId }, select: { registrationToken: true } })
    console.log('User registration token:', user.registrationToken);
    if(!user) return null
    if(!user.registrationToken) return null
    
    return user.registrationToken 
}

mongoose.connect(process.env.MONGO_URI!)
    .then(() => console.log('db connected...'))
    .catch((err) => {
        console.log(err);
    })
    
const privateKey = fs.readFileSync('/etc/letsencrypt/live/thefrekapp.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/thefrekapp.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/thefrekapp.com/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };

const httpsServer = https.createServer(credentials, app);

const io = new Server(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('user connected', socket.id);
    const userId = socket.handshake.query.userId
    if (typeof userId === 'string') {
        userSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap))

    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
        for(const key in userSocketMap){
            if(userSocketMap[key] === socket.id){
                delete userSocketMap[key]
            }
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap))
    })
})
    
const httpApp = express();
httpApp.use((req, res) => {
  res.redirect(`https://${req.headers.host}${req.url}`);
});
const httpServer = http.createServer(httpApp);

httpServer.listen(80, () => {
  console.log('HTTP server running on port 80 and redirecting to HTTPS');
});

httpsServer.listen(443, () => {
  console.log('HTTPS server running on port 443');
});

export default httpsServer;
export { io, httpsServer, httpServer };


