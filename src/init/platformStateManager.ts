const platformState = {
  Facebook: "disconnected",
  Telegram: "disconnected",
};

export const updatePlatformState = (name: string, status: "connected" | "disconnected", io) => {
  platformState[name] = status;
  io.emit("platform-status", { name, status });
  console.log(`💥 Emit platform-status ${name} ${status.toUpperCase()}`);
};
