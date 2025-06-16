import jwt from 'jsonwebtoken';
import config from '../../config';
import { PayloadGenerateToken } from '../types/data.type';

const accessSecret = config.jwtSecret!;
const refreshSecret = config.refreshTokenSecret!;

export function generateAccessToken(payload: PayloadGenerateToken) {
  return jwt.sign(payload, accessSecret, {
    expiresIn: '15m',
  });
}

export function generateRefreshToken(payload: PayloadGenerateToken) {
  return jwt.sign(payload, refreshSecret, {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret);
}