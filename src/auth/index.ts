
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { BearerStrategy, IBearerStrategyOptionWithRequest, ITokenPayload, VerifyCallback } from 'passport-azure-ad';
import { Socket } from 'socket.io';
import config from '../config';

export interface CustomSocket extends Socket {
  user?: ITokenPayload;
}

export interface CustomRequest extends Request {
  userData?: ITokenPayload;
  token?: string;
}

passport.use('oauth-bearer-google',
  new BearerStrategy(config?.auth_config?.azure_ad?.policy?.google as IBearerStrategyOptionWithRequest, (payload: ITokenPayload, done: VerifyCallback) => {
    done(null, payload, { message: "Authenticated in google_sign_in_up" + payload.oid })
  })
);

passport.use('oauth-bearer-email',
  new BearerStrategy(config?.auth_config?.azure_ad?.policy?.email as IBearerStrategyOptionWithRequest, (payload: ITokenPayload, done: VerifyCallback) => {
    done(null, payload, { message: "Authenticated in local_email_sign_in" + payload.oid })
  })
);

passport.use('oauth-bearer-microsoft',
  new BearerStrategy(config?.auth_config?.azure_ad?.policy?.microsoft as IBearerStrategyOptionWithRequest, (payload: ITokenPayload, done: VerifyCallback) => {
    done(null, payload, { message: "Authenticated in microsoft_sign_in" + payload.oid })
  })
);

const authMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
  const { authorization, policy } = req.headers;
  if (!authorization) {
    return next("No token provided");
  }

  switch (policy) {
    case "B2C_1_google_sign_in_up":
      passport.authenticate('oauth-bearer-google', { session: false }, (err: Error, user: ITokenPayload, info: any) => {
        if (err || !user) {
          console.log(err)
          console.log("error in google: ", info);
          return next("error in google \n" + info);
        }
        req.userData = user;
        req.token = authorization;
        next();
      })(req);
      break;
    case "B2C_1_email_sign_in":
      passport.authenticate('oauth-bearer-email', { session: false }, (err: Error, user: ITokenPayload, info: any) => {
        if (err || !user) {
          console.log(err)
          console.log("error in email: ", info);
          return next("error in email \n" + info);
        }
        req.userData = user;
        req.token = authorization;
        next();
      })(req);
      break;
    default:
      passport.authenticate('oauth-bearer-microsoft', { session: false }, (err: Error, user: ITokenPayload, info: any) => {
        if (err || !user) {
          console.log(err)
          console.log("error in default: ", info);
          return next("error in default \n" + info);
        }
        req.userData = user;
        req.token = authorization;
        next();
      })(req);
      break;
  }
};

const authenticateSocket = (socket: CustomSocket, next: any) => {
  const { token, policy } = socket.handshake.auth;
  if (!token) {
    return next("No token provided");
  }
  const mockReq = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  switch (policy) {
    case "B2C_1_google_sign_in_up":
      passport.authenticate('oauth-bearer-google', { session: false }, (err: Error, user: ITokenPayload, info: any) => {
        if (err || !user) {
          console.log("error in google: ", info);
          return next("error in google \n" + info);
        }
        socket.user = user;
        next();
      })(mockReq);
      break;
    case "B2C_1_email_sign_in":
      passport.authenticate('oauth-bearer-email', { session: false }, (err: Error, user: ITokenPayload, info: any) => {
        if (err || !user) {
          console.log("error in email: ", info);
          return next("error in email \n" + info);
        }
        socket.user = user;
        next();
      })(mockReq);
      break;
    default:
      passport.authenticate('oauth-bearer-microsoft', { session: false }, (err: Error, user: ITokenPayload, info: any) => {
        if (err || !user) {
          console.log("error in default: ", info);
          return next("error in default \n" + info);
        }
        socket.user = user;
        next();
      })(mockReq);
      break;
  }
};

export { authenticateSocket, authMiddleware }
