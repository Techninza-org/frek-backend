import { NextFunction, Response } from "express";
import { ExtendedRequest } from "../utils/middleware";
import { User } from "../models/user";
import { getUserToken, sendNotif, sendNotification } from "../app";

const Like = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  user.last_seen = new Date();
  await user.save();

  const likedUserId = req.body.likedUserId;
  if (!user || !likedUserId) {
    return res.status(400).send({ message: "Invalid payload" });
  }
  if (
    user._id === likedUserId ||
    user.liked.includes(likedUserId) ||
    user.matched.includes(likedUserId)
  ) {
    return res.status(400).send({ message: "You cannot like this user" });
  }
  try {
    const likedUser = await User.findById(likedUserId);
    if (!likedUser) {
      return res.status(404).send({ message: "Liked user not found" });
    }
    const isMatch = await likedUser.liked.includes(user._id);
    if (isMatch) {
      if (user.matched.includes(likedUserId)) {
        return res.status(200).send({ message: "Already matched" });
      }
      likedUser.matched.push(user._id);
      await likedUser.save();
      user.matched.push(likedUserId);
      await user.save();
      likedUser.liked.pull(user._id);
      await likedUser.save();
      sendNotif(user.id, likedUserId, user.avatar || '', 'New Match', `You have matched with ${user.name}`)
        const receiverToken = await getUserToken(likedUserId);
        console.log('Receiver Token:', receiverToken);
        if (!receiverToken) {
            console.log('Receiver not found or has no registration token', likedUserId);
        } else {
            const payload = {
                title: 'New Message',
                body: `You have matched with ${req.user.username}!`
            };
            await sendNotification(receiverToken, payload);
            console.log('Notification sent to receiver');
        }
      return res.status(200).send({ message: "It is a match" });
    } else {
      likedUser.likedBy.push(user._id);
      await likedUser.save();
      user.liked.push(likedUserId);
      await user.save();
      sendNotif(user.id, likedUserId, user.avatar, 'New Like', `Someone has liked you`)
        const receiverToken = await getUserToken(likedUserId);
        console.log('Receiver Token:', receiverToken);
        if (!receiverToken) {
            console.log('Receiver not found or has no registration token', likedUserId);
        } else {
            const payload = {
                title: 'New Like',
                body: `Someone has liked you!`
            };
            await sendNotification(receiverToken, payload);
            console.log('Notification sent to receiver');
        }
    }
    return res.status(200).send({ message: "User liked successfully" });
  } catch (err) {
    return res.status(500).send({ message: "Error liking user" });
  }
};

const dislike = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    user.last_seen = new Date();
    await user.save();
    const dislikedUserId = req.body.dislikedUserId;
    if (!user || !dislikedUserId) {
      return res.status(400).send({ message: "Invalid payload" });
    }
    if (user._id === dislikedUserId) {
      return res.status(400).send({ message: "You cannot dislike yourself" });
    }
    try {
      const dislikedUser = await User.findById(dislikedUserId);
      if (!dislikedUser) {
        return res.status(404).send({ message: "Disliked user not found" });
      }
      user.disliked.push(dislikedUserId);
      await user.save();
      return res.status(200).send({ message: "User disliked successfully" });
    } catch (err) {
      return res.status(500).send({ message: "Error disliking user" });
    }
  } catch (err) {
    return next(err);
  }
};

const actionController = { Like, dislike };
export default actionController;
