import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/user'

export type ExtendedRequest = Request & {
    user: any,
    file: any
}

const AuthMiddleware = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const token = req.headers?.authorization

    if (!token) {
        return res.status(200).send({
            status: 400,
            error: 'Authentication failed',
            error_description: 'token is required',
        })
    }

    const splittedToken = token.split(' ')
    if (splittedToken[0] !== 'Bearer') {
        return res.status(200).send({
            status: 400,
            error: 'Authentication failed',
            error_description: 'Invalid token type',
        })
    }

    let decryptedToken: any
    try {
        decryptedToken = jwt.verify(splittedToken[1], process.env.JWT_SECRET!)
    } catch (err: any) {
        return next(err)
    }

    const email: string = decryptedToken?.email
    
    if (!email) {
        const err = new Error("Error: token doens't contain email")
        return next(err)
    }
    const user = await User.findOne({ email })
    if (!user) {
        return res.status(200).send({ status: 400, error: 'user not found.', error_description: 'Account had closed.' })
    }
    delete (user as any)?.password
    req.user = user
    next()
}

// const HostAuthMiddleware = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
//     const token = req.headers?.authorization

//     if (!token) {
//         return res.status(200).send({
//             status: 400,
//             error: 'Authentication failed',
//             error_description: 'token is required',
//         })
//     }

//     const splittedToken = token.split(' ')
//     if (splittedToken[0] !== 'Bearer') {
//         return res.status(200).send({
//             status: 400,
//             error: 'Authentication failed',
//             error_description: 'Invalid token type',
//         })
//     }

//     let decryptedToken: any
//     try {
//         decryptedToken = jwt.verify(splittedToken[1], process.env.JWT_SECRET!)
//     } catch (err: any) {
//         return next(err)
//     }
//     // console.log(decryptedToken.username);

//     const phone: string = decryptedToken?.phone
//     if (!phone) {
//         const err = new Error("Error: token doens't contain email")
//         return next(err)
//     }
//     const user = await prisma.host.findFirst({ where: { phone: phone } })
//     if (!user) {
//         return res.status(200).send({ status: 400, error: 'user not found.', error_description: 'Account had closed.' })
//     }
//     delete (user as any)?.password
//     req.user = user
//     next()
// }

// const ErrorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
//     if (err instanceof Error) {
//         if (err.name === 'PrismaClientKnownRequestError') {
//             return res.status(200).send({
//                 status: 400,
//                 error: 'Invalid Payload',
//                 error_description: err.message,
//             })
//         }
//         console.log(err);
//         return res.status(200).send({
//             status: 500,
//             error: 'Internal Server Error',
//             error_description: err.message,
//         })
//     }
// }

// const AccountVerificationHandler = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
//     const user = req.user
//     if (!user.is_verified) {
//         return res.status(200).send({ status: 403, message: 'Forbidden', error: 'Account unverified.' })
//     }
//     next()
// }

const middleware = { AuthMiddleware }

export default middleware
