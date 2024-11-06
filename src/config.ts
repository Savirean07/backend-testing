import { IBearerStrategyOption } from "passport-azure-ad";
import dotenv from "dotenv";

dotenv.config();

interface IConfig {
    python_script: {
        outlook?: {
            path: string
        }
        outreach?: {
            path: string
        }
        url_scraper?: {
            path: string
        },
        linkedin_profile_scraper?: {
            path: string
        }
    },
    apis?: {
        server?: {
            url: string
            api_key?: string
        }
        openai?: {
            url: string
            api_key?: string
        }
    },
    auth_config?: {
        azure_ad?: {
            client_id?: string
            tenant_id?: string
            client_secret?: string
            policy?: {
                email: IBearerStrategyOption,
                google: IBearerStrategyOption,
                microsoft: IBearerStrategyOption
            }
        }
    },
    file_storage_path?: string,
    routes?: {
        socket?: {
            profile_analyst?: {
                namespace: string
            },
            email_generator?: {
                namespace: string
            }
        }
    }
}

// Please pass following variable in env

export default {
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
} as IConfig