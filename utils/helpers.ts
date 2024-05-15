// import nodemailer from 'nodemailer'

const isValidatePaylod = (body: any, fields: string[]): boolean => {
    if (!body) {
        return false
    }
    for (let i = 0; i < fields.length; i++) {
        if (!body[fields[i]]) return false
    }
    return true
}

const isValidDateFormat = (date: string) => {
    const splitedDate = date.split('-')
    if (splitedDate.length < 3) {
        return false
    }
    if (splitedDate[0].length < 4) {
        return false
    }
    const convert_month = Number(splitedDate[1])
    if (Number.isNaN(convert_month) || convert_month < 1 || convert_month > 12) {
        return false
    }
    const convert_date = Number(splitedDate[2])
    if (Number.isNaN(convert_date) || convert_date < 1 || convert_date > 31) {
        return false
    }
    return true
}

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.GMAIL_APP_EMAIL!,
//         pass: process.env.GMAIL_APP_PASSWORD!,
//     },
// })
// const sendMail = (to: string, subject: string, body: string) => {
//     transporter.sendMail({
//         from: process.env.GMAIL_APP_EMAIL!,
//         to: to,
//         subject: subject,
//         text: body,
//     })
// }
const imageUrlGen = (filePath: string) => {
    const baseUrl = process.env.BACKEND_BASE_URL!
    // if (baseUrl.includes(process.env.PORT!)) {
    const gen_url = process.env.BACKEND_BASE_URL! + "/images/" + filePath;
    return gen_url
    // } else {
    // const gen_url = process.env.BACKEND_BASE_URL! + `:${process.env.PORT}` + "/images/" + filePath;
    // return gen_url
    // }
}
const helper = { isValidatePaylod, isValidDateFormat, imageUrlGen }  //sendMail
export default helper

