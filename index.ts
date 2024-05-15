import dotenv from 'dotenv'
dotenv.config()

const PORT = process.env.PORT || 3000
import('./app')
    .then((app) => {
        app.default.listen(PORT, () => console.log(`Server running on ${PORT}`))
    })
    .catch((err) => {
        console.error('Error in loading app', err)
    })