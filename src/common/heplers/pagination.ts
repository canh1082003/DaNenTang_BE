import { toNumber } from "lodash";

export const paginate = (page?: number | string, limit?: number | string) => {
  const offset = page && limit ? (toNumber(page) - 1) * toNumber(limit) : undefined;

  return {
    offset,
    limit: limit && toNumber(limit),
  };
};
