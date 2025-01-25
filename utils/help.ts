import { User } from "../models/user";

export const generateRandomUsername = async (name: string) => {
    //geneate random username which is unique
    let username = name.replace(/ /g, "").toLowerCase();
    let user = await User.findOne({ username });
    if (user) {
        username = username + Math.floor(Math.random() * 1000);
    }
    return username;
}