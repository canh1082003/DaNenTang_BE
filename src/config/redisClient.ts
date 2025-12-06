// import Redis from "ioredis";

// const redisUrl: string = process.env.REDIS_URL || "redis://localhost:6379";

// const isTLS = redisUrl.startsWith("rediss://");

// export const redis = new Redis(redisUrl, {
//   tls: isTLS ? {} : undefined,
//   maxRetriesPerRequest: null,
// });

// redis.on("connect", () => {
//   console.log("✔ Redis connected");
// });

// redis.on("error", (err) => {
//   console.error("❌ Redis error:", err);
// });
import { createClient } from "redis";

const client = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

client.on("error", (err) => console.log("Redis Client Error", err));

export async function initRedis() {
  if (!client.isOpen) {
    await client.connect();
    console.log("✔ Redis connected");
  }
}

export const redis = client;

