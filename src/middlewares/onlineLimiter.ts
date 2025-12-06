import { redis } from "../config/redisClient";

export const onlineLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next();
    }

    await redis.sAdd("online_users", userId);
    await redis.expire("online_users", 60); // auto remove sau 60s

    const online = await redis.sCard("online_users");

    if (online > 1) {
      return res.status(503).json({
        message: "Hệ thống đang quá tải, vui lòng thử lại sau."
      });
    }

    next();
  } catch (error) {
    console.error("Online limiter error:", error);
    next();
  }
};
