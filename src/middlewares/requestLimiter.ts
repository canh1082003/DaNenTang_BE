import { redis } from "../config/redisClient";

export const requestLimiter = (maxReq: number, windowSec: number) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
       if (!userId) {
        return next();
       }
      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        req.socket.remoteAddress ||
        req.ip;

      const key = `req:${ip}`;

      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      if (count > maxReq) {
        await redis.set(`blocked_user:${userId}`, "1", { EX: 2 * 60 * 60 });
        return res.status(403).json({
          message: "Bạn đã spam quá nhiều. Tài khoản bị khoá trong 2 giờ.",
        });
      }

      next();
    } catch (err) {
      console.error("Rate limiter error:", err);
      next();
    }
  };
};
