"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Please pass following variable in env
exports.default = {
    python_script: {
        outlook: {
            path: process.env.OUTLOOK_TOOL_PATH
        },
        outreach: {
            path: process.env.OUTREACH_TOOL_PATH
        },
        url_scraper: {
            path: process.env.URL_SCRAPER_PATH
        },
        linkedin_profile_scraper: {
            path: process.env.LINKEDIN_PROFILE_SCRAPER_PATH
        }
    },
    apis: {
        server: {
            url: process.env.SERVER_URL
        }
    },
    auth_config: {
        azure_ad: {
            policy: {
                email: {
                    identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA_EMAIL,
                    clientID: process.env.CLIENT_ID,
                    isB2C: true,
                    policyName: process.env.POLICY_NAME_EMAIL,
                    validateIssuer: true,
                    passReqToCallback: false,
                    loggingLevel: 'error'
                },
                google: {
                    identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA_GOOGLE,
                    clientID: process.env.CLIENT_ID,
                    isB2C: true,
                    policyName: process.env.POLICY_NAME_GOOGLE,
                    validateIssuer: true,
                    passReqToCallback: false,
                    loggingLevel: 'error'
                },
                microsoft: {
                    identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA_MICROSOFT,
                    clientID: process.env.CLIENT_ID,
                    isB2C: false,
                    policyName: process.env.POLICY_NAME_MICROSOFT,
                    validateIssuer: false,
                    passReqToCallback: false,
                    loggingLevel: 'error'
                }
            }
        }
    },
    file_storage_path: process.env.FILE_STORAGE_PATH,
    routes: {
        socket: {
            profile_analyst: {
                namespace: "/ws/role/profile-analyst"
            },
            email_generator: {
                namespace: "/ws/role/email-generator"
            }
        }
    }
};
