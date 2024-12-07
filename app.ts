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
import adminRouter from "./routes/admin.routes";
import cron from 'node-cron';
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from "agora-access-token";

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

        res.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

app.post("/generate-rtc-token", (req, res) => {
    const { channelName, uid, role = "PUBLISHER", tokenExpiration = 3600} = req.body;
  
    // Validate input
    if (!channelName || uid == null) {
      return res.status(400).json({ error: "channelName and uid are required" });
    }
  
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
    if (!appId || !appCertificate) {
      return res.status(500).json({ error: "AGORA_APP_ID or AGORA_APP_CERTIFICATE not set in environment variables" });
    }
  
    // Set role
    const rtcRole = role === "SUBSCRIBER" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  
    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            rtcRole,
            tokenExpiration
          );
      return res.json({ token });
    } catch (err) {
      console.error("Error generating token:", err);
      return res.status(500).json({ error: "Failed to generate token" });
    }
});

app.post("/generate-rtm-token", (req, res) => {
    const { userAccount } = req.body;
    const salt = Math.floor(Math.random() * 100000); // Generate a random salt
    const expirationTimeInSeconds = 86400; // Validity of the token (1 hour)
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;
  
    // Validate the request
    if (!userAccount) {
      return res.status(400).json({ error: "userAccount is required" });
    }
  
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
    if (!appId || !appCertificate) {
      return res.status(500).json({ error: "AGORA_APP_ID or AGORA_APP_CERTIFICATE not set in environment variables" });
    }
  
    try {
      // Generate the RTM token
      const token = RtmTokenBuilder.buildToken(appId, appCertificate, userAccount, salt, privilegeExpiredTs);
      
      return res.json({ token });
    } catch (err) {
      console.error("Error generating RTM token:", err);
      return res.status(500).json({ error: "Failed to generate RTM token" });
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

app.use('/admin', adminRouter)

app.use('/stream', streamRouter)

export const sendNotif = async (
    senderId: string,
    receiverId: string,
    senderProfile: string,
    title: string,
    message: string,
    type: string
) => {
    try {
        const notif = await Notification.create({
            sender_id: senderId,
            receiver_id: receiverId,
            sender_profile: senderProfile,
            title: title,
            message: message,
            type: type
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
    const user = await User.findById(userId).select('registrationToken');
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

cron.schedule('0 0 * * *', async () => {
    console.log('running a task every day');
    const notifications = Notification.find({read: true})
    for await (const notification of notifications) {
        if(notification.createdAt < new Date(Date.now() - 7*24*60*60*1000)){
            await Notification.findByIdAndDelete(notification._id)
        }
    }
});

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

const groupUsers = new Map()

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

                //======== logic for group chat start here =========

        // Remove the user from the 'users' Map

        if (groupUsers.size > 0){

            groupUsers.forEach((value, key) => {
                if (value.socketId === socket.id) {
                    groupUsers.delete(key);
                    console.log(`User ${key} removed from groupUsers | (at the time of disconnect)`);
                }
            });

            //print all users in the group
            console.log(`Users in group (at time of disconnect, after leaving) : ${groupUsers.size}`);
        }
        
        //======== logic for group chat ends here =========


        io.emit('getOnlineUsers', Object.keys(userSocketMap))
    })

    //============= Group Chat Start =============
    socket.on('joinGroup', ({ userId, groupId }) => {

        // Store the user’s database ID along with socketId and group information
        groupUsers.set(userId, { socketId: socket.id, groupId: groupId })

        // Add the user to the specified group
        socket.join(groupId)

        // Notify other users in the group that a new user has joined
        // socket.to(groupId).emit('userJoined', { userId })
        console.log(`User ${userId} joined group ${groupId}`)
    });

    // Event: User sends a message to the group
    socket.on('sendGroupMessage', ({ userId, groupId, groupMessage }) => {
        const userSocketInfoFromGroupUsers = groupUsers.get(userId); // Get user info from the 'users' Map using userId (from DB)

        if (userSocketInfoFromGroupUsers) {
            // Send the message to all users in the group
            io.to(groupId).emit('recieveGroupMessage', { senderUserId: userId, groupMessage: groupMessage });

            // Log the sent message for debugging or tracking
            console.log(`User ${userId} sent a message: '${groupMessage}' to group ${groupId}`);
        } else {
            console.log(`User ${userId} not found in group ${groupId} | inside sendGroupMessage`);
        }
    });

    // Event: user leave group
    socket.on('leaveGroup', ({ userId, groupId }) => {
        const userSocketInfoFromGroupUsers = groupUsers.get(userId); // Get user info from the 'users' Map using userId (from DB)

        if (userSocketInfoFromGroupUsers) {
            socket.leave(groupId); // Remove the user from the group
            io.to(groupId).emit('userLeftsFromGroup', { userId: userId }); // Notify other users in the group that a user has left

            // Remove the user from the 'users' Map (effectively removing them from the system)
            groupUsers.delete(userId);

            console.log(`User ${userId} left group ${groupId}`);

            //print all users in the group
            console.log(`Users in group (at time of leave, after leaving) ${groupId}: ${groupUsers.size}`);
            
        } else {
            console.log(`User ${userId} not found in group ${groupId} | inside leaveGroup`);
        }
    });

    // Event: Get the number of users in a group
    socket.on('groupUsersCount', ({groupId}) => {
        const groupUsersCount = io.sockets.adapter.rooms.get(groupId)?.size || 0;
        console.log(`Group ${groupId} has ${groupUsersCount} users`);
        
        socket.emit('recieveGroupUsersCount', { groupUsersCount: groupUsersCount });
    });

    //============= Group Chat End =============
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

//======================================VIVEK CODE STARTS HERE======================================
// import express from "express"
// import cors from 'cors'
// import mongoose from "mongoose"
// import dotenv from 'dotenv'
// import http from 'http';
// import https from 'https';
// import { Server } from 'socket.io';
// import authRouter from "./routes/auth.routes"
// import userRouter from "./routes/user.routes"
// import middleware from "./utils/middleware"
// import actionRouter from "./routes/action.routes"
// import messageRouter from "./routes/message.routes"
// import path from "path";
// import { Stripe } from "stripe"
// import fs from "fs";
// import streamRouter from "./routes/stream.routes";
// import { Notification } from "./models/notification";
// import * as admin from 'firebase-admin'
// import { User } from "./models/user";
// import adminRouter from "./routes/admin.routes";
// import cron from 'node-cron';
// import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from "agora-access-token";
// import { StreamGroup } from "./models/streamGroup";
// dotenv.config()

// const app = express()

// app.use(cors())
// app.use(express.json())
// app.use('/public', express.static(path.join(__dirname, 'public')));


// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)

// try {
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//         databaseURL: process.env.FIREBASE_DATABASE_URL,
//     })

//     console.log('Firebase Admin initialized successfully.')
// } catch (error) {
//     console.error('Error initializing Firebase Admin:', error)
// }

// const stripe = new Stripe('sk_test_51PzcN8P42SraKXdKdAD7cqNY3OT84LAArOn8PcwOKvN7Sv7Lwk4I3BREqVwpPFJkLIqOUVC4o5m1UgRslnjZaSmc00Zln9LoDQ');

// export const getReceiverSocketId = (receiverId: string) => {
//     return userSocketMap[receiverId]
// }

// const userSocketMap: { [key: string]: string } = {};

// app.get('/ping', (req, res) => {
//     return res.status(200).send({message: 'pong'})
// })

// app.post('/create-payment-intent', async (req, res) => {
//     const { amount, currency } = req.body;
//     try {
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount, 
//             currency,
//         });

//         res.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
//     } catch (error: any) {
//         res.status(500).send({ error: error.message });
//     }
// });

// app.get('/', (req, res) => res.send('Server running...'))

// app.use('/auth', authRouter)
// //@ts-ignore
// app.use('/user', middleware.AuthMiddleware, userRouter)
// //@ts-ignore
// app.use('/action', middleware.AuthMiddleware, actionRouter)
// //@ts-ignore
// app.use('/message', middleware.AuthMiddleware, messageRouter)

// app.use('/admin', adminRouter)

// app.use('/stream', streamRouter)

// export const sendNotif = async (
//     senderId: string,
//     receiverId: string,
//     senderProfile: string,
//     title: string,
//     message: string,
//     type: string
// ) => {
//     try {
//         const notif = await Notification.create({
//             sender_id: senderId,
//             receiver_id: receiverId,
//             sender_profile: senderProfile,
//             title: title,
//             message: message,
//             type: type
//         });

//         console.log('Notification created:', notif);
//     } catch (error) {
//         console.error('Error creating notification:', error);
//     }
// };


// export const sendNotification = async (registrationToken: string, payload: { title: string; body: string }) => {
//     try {
//         const message = {
//             token: registrationToken,
//             notification: {
//                 title: payload.title,
//                 body: payload.body,
//             },
//         }

//         const response = await admin.messaging().send(message)
//         console.log('Successfully sent message:', response)
//         return response
//     } catch (error) {
//         console.error('Error sending message:', error)
//     }
// }

// export const getUserToken = async (userId: any) => {
//     console.log('Getting user token:', userId);
//     const user = await User.findById(userId).select('registrationToken');
//     console.log('User registration token:', user.registrationToken);
//     if(!user) return null
//     if(!user.registrationToken) return null
    
//     return user.registrationToken 
// }

// mongoose.connect(process.env.MONGO_URI!)
//     .then(() => console.log('db connected...'))
//     .catch((err) => {
//         console.log(err);
//     })
    
// // const privateKey = fs.readFileSync('/etc/letsencrypt/live/thefrekapp.com/privkey.pem', 'utf8');
// // const certificate = fs.readFileSync('/etc/letsencrypt/live/thefrekapp.com/cert.pem', 'utf8');
// // const ca = fs.readFileSync('/etc/letsencrypt/live/thefrekapp.com/chain.pem', 'utf8');

// // const credentials = {
// //     key: privateKey,
// //     cert: certificate,
// //     ca: ca
// //   };

// // const httpsServer = https.createServer(credentials, app);
// const httpServerViv = http.createServer(app);

// // const io = new Server(httpsServer, {
// const io = new Server(httpServerViv, {
//     cors: {
//         origin: '*',
//         methods: ['GET', 'POST']
//     }
// });

// const groupUsers = new Map()

// io.on('connection', (socket) => {
//     console.log('user connected', socket.id);
//     const userId = socket.handshake.query.userId
//     if (typeof userId === 'string') {
//         userSocketMap[userId] = socket.id;
//     }

//     io.emit('getOnlineUsers', Object.keys(userSocketMap))

//     socket.on('disconnect', () => {
//         console.log('user disconnected', socket.id);
//         for(const key in userSocketMap){
//             if(userSocketMap[key] === socket.id){
//                 delete userSocketMap[key]
//             }
//         }

//         //======== logic for group chat start here =========

//         // Remove the user from the 'users' Map

//         if (groupUsers.size > 0){

//             groupUsers.forEach((value, key) => {
//                 if (value.socketId === socket.id) {
//                     groupUsers.delete(key);
//                     console.log(`User ${key} removed from groupUsers | (at the time of disconnect)`);
//                 }
//             });

//             //print all users in the group
//             console.log(`Users in group (at time of disconnect, after leaving) : ${groupUsers.size}`);
//         }
        
//         //======== logic for group chat ends here =========

//         io.emit('getOnlineUsers', Object.keys(userSocketMap))
//     })

//     //============= Group Chat Start =============
//     socket.on('joinGroup', async ({ userId, groupId }) => {

//         // Store the user’s database ID along with socketId and group information
//         groupUsers.set(userId, { socketId: socket.id, groupId: groupId })

//         // Add the user to the specified group
//         socket.join(groupId)

//         const isValidStreamGroupId = mongoose.Types.ObjectId.isValid(groupId);
//         const streamGroup = isValidStreamGroupId ? await StreamGroup.findOne({_id: groupId}) : false;

//         // if streamGroup is not found, stop execution
//         // if (!streamGroup) {
//         //     console.log(`Stream group ${groupId} not found | inside if condition`);
//         //     return;
//         // }

//         if (streamGroup) {

//             const isValidUser = mongoose.Types.ObjectId.isValid(userId);
//             const user = isValidUser ? await User.findOne({_id: userId}) : false;

//             if (user){
//                 streamGroup.connectedUsers.push(user._id);
//                 await streamGroup.save();
//             }
//         }

//         console.log(`after if condition | entered groupId: ${groupId} | streamGroupfound: ${streamGroup ? true : false} | by userId: ${userId}`);

//         // Notify other users in the group that a new user has joined
//         socket.to(groupId).emit('userJoined', { userId })
//         console.log(`User ${userId} joined group ${groupId}`)

//         //print all users in the group
//         console.log(`Users in group ${groupId}: ${groupUsers.size}`);
//     });

//     // Event: User sends a message to the group
//     socket.on('sendGroupMessage', ({ userId, groupId, groupMessage }) => {
//         const userSocketInfoFromGroupUsers = groupUsers.get(userId); // Get user info from the 'users' Map using userId (from DB)

//         if (userSocketInfoFromGroupUsers) {
//             // Send the message to all users in the group
//             io.to(groupId).emit('recieveGroupMessage', { senderUserId: userId, groupMessage: groupMessage });

//             // Log the sent message for debugging or tracking
//             console.log(`User ${userId} sent a message: '${groupMessage}' to group ${groupId}`);
//         } else {
//             console.log(`User ${userId} not found in group ${groupId} | inside sendGroupMessage`);
//         }
//     });

//     // Event: user leave group
//     socket.on('leaveGroup', ({ userId, groupId }) => {
//         const userSocketInfoFromGroupUsers = groupUsers.get(userId); // Get user info from the 'users' Map using userId (from DB)

//         if (userSocketInfoFromGroupUsers) {
//             socket.leave(groupId); // Remove the user from the group
//             io.to(groupId).emit('userLeftsFromGroup', { userId: userId }); // Notify other users in the group that a user has left

//             // Remove the user from the 'users' Map (effectively removing them from the system)
//             groupUsers.delete(userId);

//             console.log(`User ${userId} left group ${groupId}`);

//             //print all users in the group
//             console.log(`Users in group (at time of leave, after leaving) ${groupId}: ${groupUsers.size}`);
//         } else {
//             console.log(`User ${userId} not found in group ${groupId} | inside leaveGroup`);
//         }
//     });

//     // Event: Get the number of users in a group
//     socket.on('groupUsersCount', ({groupId}) => {
//         const groupUsersCount = io.sockets.adapter.rooms.get(groupId)?.size || 0;
//         console.log(`Group ${groupId} has ${groupUsersCount} users`);
        
//         socket.emit('recieveGroupUsersCount', { groupUsersCount: groupUsersCount });
//     });

//     //============= Group Chat End =============
// })
    
// const httpApp = express();
// httpApp.use((req, res) => {
//   res.redirect(`https://${req.headers.host}${req.url}`);
// });
// // const httpServer = http.createServer(httpApp);

// // httpServerViv.listen(3000, () => {
// //   console.log('HTTP server running on port 80 and redirecting to HTTPS');
// // });

// // httpsServer.listen(443, () => {
// // httpServer.listen(443, () => {
// //   console.log('HTTPS server running on port 443');
// // });

// // export default httpsServer;
// // export { io, httpsServer, httpServer };
// export { io, httpServerViv };