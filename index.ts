import multer from 'multer'
import dotenv from 'dotenv'
dotenv.config()
import fs from 'fs'

const staticFilePath = __dirname + '/public'
try {
    fs.readdirSync(staticFilePath)
} catch (err) {
    try {
        fs.mkdirSync(staticFilePath)
    } catch (err) {
        console.error(err)
    }
}

const imageStorage = multer.diskStorage({
    destination: staticFilePath + '/images',
    filename: function (req, file, cb) {
        const uniquePrefix = new Date().getTime()
        cb(null, `${uniquePrefix}-${file.originalname}`)
    },
})
export const upload = multer({ storage: imageStorage })

const PORT = process.env.PORT || 3000
import('./app')
    .then((server) => {
        server.default.listen(PORT, () => console.log(`Server running on ${PORT}`))
    })
    .catch((err) => {
        console.error('Error in loading app', err)
    })