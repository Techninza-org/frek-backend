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
import fs from "fs";
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use('/public', express.static(path.join(__dirname, 'public')));

export const getReceiverSocketId = (receiverId: string) => {
    return userSocketMap[receiverId]
}

const userSocketMap: { [key: string]: string } = {};

app.get('/ping', (req, res) => {
    return res.status(200).send({message: 'pong'})
})

app.get('/', (req, res) => res.send('Server running...'))

app.use('/auth', authRouter)
//@ts-ignore
app.use('/user', middleware.AuthMiddleware, userRouter)
//@ts-ignore
app.use('/action', middleware.AuthMiddleware, actionRouter)
//@ts-ignore
app.use('/message', middleware.AuthMiddleware, messageRouter)

mongoose.connect(process.env.MONGO_URI!)
    .then(() => console.log('db connected...'))
    .catch((err) => {
        console.log(err);
    })
    
const privateKey = fs.readFileSync('/etc/letsencrypt/live/example.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/example.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/example.com/chain.pem', 'utf8');

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


