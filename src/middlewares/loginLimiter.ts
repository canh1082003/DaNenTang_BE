import { redis } from "../config/redisClient";
export const loginLimiter = async (req, res, next) => {
    const ip = req.ip;
    const email = req.body.email;
    if (!email) {
      return next();
    }
    const key = `login:${email}:${ip}`;
    const fails = await redis.incr(key);
    if (fails === 1) {
      await redis.expire(key, 300);
    }

    if (fails > 5) {
      return res.status(423).json({
        message: "Too many login attempts, try again later",
      });
    }
    next();

};
