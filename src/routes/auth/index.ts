import { Request, Router } from "express";
import { PublicClientApplication } from "@azure/msal-node";
const authRouter = Router();

interface AuthenticatedRequest extends Request {
    session: {
        accessToken: string;
    };
}

// Azure AD B2C configuration
const config = {
    auth: {
        clientId: process.env.CLIENT_ID as string, // Application (client) ID
        authority: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", // Authority URL
        redirectUri: 'http://localhost:3000', // Redirect URI
        scope: ['Mail.Send', 'User.Read', 'profile'], // API identifier
        clientSecret: "sIx8Q~EgMK7v7dCzbGD~fRu_g_uAi5f3udkKScYD" as string,
    },
};

// Create a new instance of the MSAL client
const pca = new PublicClientApplication(config);

authRouter.get('/login', async (req, res) => {
    const authUrl = await pca.getAuthCodeUrl({
        scopes: config.auth.scope,
        redirectUri: config.auth.redirectUri,
    });
    res.redirect(authUrl);
});

authRouter.get('/callback', async (req: Request, res) => {
    const { code } = req.query as { code: string };

    if (code) {
        try {
            const tokenResponse = await pca.acquireTokenByCode({
                code,
                scopes: config.auth.scope,
                redirectUri: config.auth.redirectUri,
                authority: config.auth.authority,
            });

            (req as AuthenticatedRequest).session.accessToken = tokenResponse.accessToken;
            res.send(`Access Token: ${tokenResponse.accessToken}`);
        } catch (error) {
            console.error('Error acquiring token:', error);
            res.status(500).send('Error acquiring token');
        }
    } else {
        res.status(400).send('No code found in the query');
    }
});

authRouter.get('/refresh', async (req: Request, res) => {

    try {
        const refreshToken = req.headers.authorization;
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }
        const tokenResponse = await pca.acquireTokenByRefreshToken({
            refreshToken,
            scopes: config.auth.scope,
            redirectUri: config.auth.redirectUri,
            authority: config.auth.authority,
        });
        if (!tokenResponse) {
            throw new Error('No token response');
        }
        (req as AuthenticatedRequest).session.accessToken = tokenResponse.accessToken;
        res.send(`Access Token: ${tokenResponse.accessToken}`);
    } catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).send('Error acquiring token');
    }

});
export default authRouter;