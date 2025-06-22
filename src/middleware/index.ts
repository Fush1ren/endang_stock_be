import { Response, NextFunction } from 'express'
import { user, UserRequest } from '../types/userRequest'
import { responseAPI } from '../api/utils'
import { verifyAccessToken } from '../api/utils/jwt.util'
import jwt from 'jsonwebtoken'

export const verifyToken = (req: UserRequest, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    responseAPI(res, {
      status: 401,
      message: 'No token provided',
    });
    return;
  }

  try {
    const decoded = verifyAccessToken(token) as user;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      responseAPI(res, {
        status: 401,
        message: 'Access token expired',
      })
      return;
    }
    console.error("Invalid refresh token", error);
    responseAPI(res, {
      status: 403,
      message: 'Invalid token',
    });
    return;
  }
};

// export const verifyToken = (req: UserRequest, res: Response, next: NextFunction) => {
//   const token = req.headers['authorization']?.split(' ')[1]
//   if (!token) {
//     res.status(401).json({ message: 'No token provided' })
//     return;
//   }

//   try {
//     const decoded = verifyAccessToken(token) as user
//     req.user = decoded;

//     next();
//   } catch (error) {
//     responseAPI(res, {
//       status: 403,
//       message: 'Invalid token',
//     })
//     return;
//   }

// }

// jwt.verify(token, config.jwtSecret, (err, user) => {
//   if (err) {
//     res.status(403).json({ message: 'Invalid token' })
//     return;
//   }

//   req.user = user as user

//   next()
// })
