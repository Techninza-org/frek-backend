import express from "express"
import cors from 'cors'
import mongoose from "mongoose"
import dotenv from 'dotenv'
import http from 'http';
import { Server } from 'socket.io';
import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import middleware from "./utils/middleware"
import actionRouter from "./routes/action.routes"
import messageRouter from "./routes/message.routes"
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

export const getReceiverSocketId = (receiverId: string) => {
    return userSocketMap[receiverId]
}

const userSocketMap: { [key: string]: string } = {};


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
    
export default server
export { io, server }

