import express from "express"
import cors from 'cors'
import mongoose from "mongoose"
import dotenv from 'dotenv'
import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import middleware from "./utils/middleware"
dotenv.config()


const app = express()
app.use(cors())
app.use(express.json())

app.get('/ping', (req, res) => {
    return res.status(200).send({message: 'pong'})
})

app.get('/', (req, res) => res.send('Server running...'))

app.use('/auth', authRouter)
//@ts-ignore
app.use('/user', middleware.AuthMiddleware, userRouter)

//connecting to db
mongoose.connect(process.env.MONGO_URI!)
    .then(() => console.log('db connected...'))
    .catch((err) => {
        console.log(err);
    })


export default app

