import { NextFunction ,Request,Response } from "express";
import twilio from "twilio";
class WebRtcController {
  async getIceServers (req: Request, res: Response, next: NextFunction) {
    try {
      const client = twilio(
        process.env.TWILIO_SSID,
        process.env.TWILIO_SERCET,
         { accountSid: process.env.TWILIO_ACCOUNT_SID }
      );
      const token = await client.tokens.create();
      return res.json({ iceServers: token.iceServers });
    } catch (error) {
      console.log(error);
     next(error);
    }
  }
}
export default new WebRtcController();
