import { redis } from "../config/redisClient";

export const loginLimiter = async (req, res, next) => {
  const ip = req.ip;
  const email = req.body.email;

  if (!email) {return next();}

  const failKey = `login_fail:${email}`;
  const blockKey = `blocked_user:${email}`;

  // 1. Kiểm tra user có bị khóa chưa
  const isBlocked = await redis.get(blockKey);
  if (isBlocked) {
    return res.status(423).json({
      message: "Tài khoản tạm khóa do nhập sai quá nhiều. Vui lòng thử lại sau.",
    });
  }

  // 2. Tăng số lần login sai (counter)
  const fails = await redis.incr(failKey);

  // 3. Set TTL cho counter lần đầu tiên
  if (fails === 1) {
    await redis.expire(failKey, 300); // reset sau 5 phút
  }

  // 4. Nếu vượt giới hạn => khóa 2 giờ
  if (fails > 20) {
    await redis.set(blockKey, "1", { EX: 7200 }); // 2 giờ
    return res.status(423).json({
      message: "Bạn đã nhập sai quá nhiều. Tài khoản bị khóa trong 2 giờ.",
    });
  }

  next();
};
