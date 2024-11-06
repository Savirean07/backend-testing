"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.authenticateSocket = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_azure_ad_1 = require("passport-azure-ad");
const config_1 = __importDefault(require("../config"));
passport_1.default.use('oauth-bearer-google', new passport_azure_ad_1.BearerStrategy((_c = (_b = (_a = config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.auth_config) === null || _a === void 0 ? void 0 : _a.azure_ad) === null || _b === void 0 ? void 0 : _b.policy) === null || _c === void 0 ? void 0 : _c.google, (payload, done) => {
    done(null, payload, { message: "Authenticated in google_sign_in_up" + payload.oid });
}));
passport_1.default.use('oauth-bearer-email', new passport_azure_ad_1.BearerStrategy((_f = (_e = (_d = config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.auth_config) === null || _d === void 0 ? void 0 : _d.azure_ad) === null || _e === void 0 ? void 0 : _e.policy) === null || _f === void 0 ? void 0 : _f.email, (payload, done) => {
    done(null, payload, { message: "Authenticated in local_email_sign_in" + payload.oid });
}));
passport_1.default.use('oauth-bearer-microsoft', new passport_azure_ad_1.BearerStrategy((_j = (_h = (_g = config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.auth_config) === null || _g === void 0 ? void 0 : _g.azure_ad) === null || _h === void 0 ? void 0 : _h.policy) === null || _j === void 0 ? void 0 : _j.microsoft, (payload, done) => {
    done(null, payload, { message: "Authenticated in microsoft_sign_in" + payload.oid });
}));
const authMiddleware = (req, res, next) => {
    const { authorization, policy } = req.headers;
    if (!authorization) {
        return next("No token provided");
    }
    switch (policy) {
        case "B2C_1_google_sign_in_up":
            passport_1.default.authenticate('oauth-bearer-google', { session: false }, (err, user, info) => {
                if (err || !user) {
                    console.log(err);
                    console.log("error in google: ", info);
                    return next("error in google \n" + info);
                }
                req.userData = user;
                req.token = authorization;
                next();
            })(req);
            break;
        case "B2C_1_email_sign_in":
            passport_1.default.authenticate('oauth-bearer-email', { session: false }, (err, user, info) => {
                if (err || !user) {
                    console.log(err);
                    console.log("error in email: ", info);
                    return next("error in email \n" + info);
                }
                req.userData = user;
                req.token = authorization;
                next();
            })(req);
            break;
        default:
            passport_1.default.authenticate('oauth-bearer-microsoft', { session: false }, (err, user, info) => {
                if (err || !user) {
                    console.log(err);
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
exports.authMiddleware = authMiddleware;
const authenticateSocket = (socket, next) => {
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
            passport_1.default.authenticate('oauth-bearer-google', { session: false }, (err, user, info) => {
                if (err || !user) {
                    console.log("error in google: ", info);
                    return next("error in google \n" + info);
                }
                socket.user = user;
                next();
            })(mockReq);
            break;
        case "B2C_1_email_sign_in":
            passport_1.default.authenticate('oauth-bearer-email', { session: false }, (err, user, info) => {
                if (err || !user) {
                    console.log("error in email: ", info);
                    return next("error in email \n" + info);
                }
                socket.user = user;
                next();
            })(mockReq);
            break;
        default:
            passport_1.default.authenticate('oauth-bearer-microsoft', { session: false }, (err, user, info) => {
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
exports.authenticateSocket = authenticateSocket;
