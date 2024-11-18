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

const PORT = process.env.PORT || 3000;
const HTTP_PORT = process.env.HTTP_PORT || 80;

// const HTTP_PORT = process.env.HTTP_PORT || 3000;  //vivek

import('./app')
    .then((server) => {
        const httpsServer = server.httpsServer; 
        const httpServer = server.httpServer; 
        httpsServer.listen(PORT, () => {
            console.log(`HTTPS Server running on port ${PORT}`);
        });

        // const httpServer = server.httpServerViv; //vivek 

        httpServer.listen(HTTP_PORT, () => {
            console.log(`HTTP Server running on port ${HTTP_PORT} and redirecting to HTTPS`);
        });
    })
    .catch((err) => {
        console.error('Error in loading app', err);
    });
