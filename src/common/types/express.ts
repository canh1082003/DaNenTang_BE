
import express from 'express';

interface Session {
  email: string;
  uid: string;
  role: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export type RequestCustom = express.Request & { session: Session };
