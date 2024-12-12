import { config } from 'dotenv';
import twilio, { Twilio } from 'twilio';

config(); // Load environment variables

// Get Twilio account SID and auth token from environment variables
const accountSid: string = String(process.env.TWILIO_ACCOUNT_SID);
const authToken: string = String(process.env.TWILIO_AUTH_TOKEN);
const messagingServiceSid: string = String(process.env.TWILIO_MESSAGING_SERVICE);
const client: Twilio = twilio(accountSid, authToken);

export const sendTwilioOtp = async (sentTo: string, body: string): Promise<void> => {
  try {
    const message = await client.messages.create({
      body: 'You have an appointment with Owl, Inc. on Friday, November 3 at 4:00 PM. Reply C to confirm.',
    //   messagingServiceSid: 'MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Your Messaging Service SID here
      messagingServiceSid: messagingServiceSid, // Your Messaging Service SID here
      to: sentTo, // Example Nigerian number with country code +234
    });
    console.log(message.sid);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};