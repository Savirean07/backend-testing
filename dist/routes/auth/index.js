"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const msal_node_1 = require("@azure/msal-node");
const authRouter = (0, express_1.Router)();
// Azure AD B2C configuration
const config = {
    auth: {
        clientId: process.env.CLIENT_ID, // Application (client) ID
        authority: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", // Authority URL
        redirectUri: 'http://localhost:3000', // Redirect URI
        scope: ['Mail.Send', 'User.Read', 'profile'], // API identifier
        clientSecret: "sIx8Q~EgMK7v7dCzbGD~fRu_g_uAi5f3udkKScYD",
    },
};
// Create a new instance of the MSAL client
const pca = new msal_node_1.PublicClientApplication(config);
authRouter.get('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authUrl = yield pca.getAuthCodeUrl({
        scopes: config.auth.scope,
        redirectUri: config.auth.redirectUri,
    });
    res.redirect(authUrl);
}));
authRouter.get('/callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.query;
    if (code) {
        try {
            const tokenResponse = yield pca.acquireTokenByCode({
                code,
                scopes: config.auth.scope,
                redirectUri: config.auth.redirectUri,
                authority: config.auth.authority,
            });
            req.session.accessToken = tokenResponse.accessToken;
            res.send(`Access Token: ${tokenResponse.accessToken}`);
        }
        catch (error) {
            console.error('Error acquiring token:', error);
            res.status(500).send('Error acquiring token');
        }
    }
    else {
        res.status(400).send('No code found in the query');
    }
}));
authRouter.get('/refresh', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refreshToken = req.headers.authorization;
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }
        const tokenResponse = yield pca.acquireTokenByRefreshToken({
            refreshToken,
            scopes: config.auth.scope,
            redirectUri: config.auth.redirectUri,
            authority: config.auth.authority,
        });
        if (!tokenResponse) {
            throw new Error('No token response');
        }
        req.session.accessToken = tokenResponse.accessToken;
        res.send(`Access Token: ${tokenResponse.accessToken}`);
    }
    catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).send('Error acquiring token');
    }
}));
exports.default = authRouter;
