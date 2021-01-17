const Sdk = require('@fusebit/add-on-sdk');
const { OAuthConnector } = require('@fusebit/oauth-connector');
const { WebClient } = require('@slack/web-api');
const { verifyRequestSignature } = require('@slack/events-api');
const Superagent = require('superagent');

const httpError = (res, status, message) => {
    res.status(status);
    res.send({
        status,
        statusCode: status,
        message,
    });
};

class SlackConnector extends OAuthConnector {
    constructor() {
        super();
    }

    /**
     * Called during connector initialization to allow the connector to register additional, application-specific
     * routes on the provided Express router.
     * @param {*} app Express router
     */
    onCreate(app) {
        super.onCreate(app);

        const authorizeNotificationRequest = this.authorize({
            action: 'function:execute',
            resourceFactory: (req) =>
                `/account/${req.fusebit.accountId}/subscription/${req.fusebit.subscriptionId}/boundary/${req.fusebit.boundaryId}/function/${req.fusebit.functionId}/`,
        });

        const postNotification = async (req, res) => {
            if (!req.params.userContext) {
                return httpError(res, 404, 'Not found');
            } else {
                Sdk.debug(`Sending notification to Slack user ${req.params.userContext.vendorUserId}`);
                let response;
                try {
                    const client = await this.createSlackClient(req.fusebit, req.params.userContext);
                    response = (await this.sendNotification(req.fusebit, req.params.userContext, client)) || { status: 200 };
                } catch (e) {
                    Sdk.debug(`Error sending notification to Slack: ${e.message}`);
                    return httpError(res, 500, `Error sending notification to Slack: ${e.message}`);
                }
                res.status(response.status || 200);
                response.body ? res.json(response.body) : res.end();
            }
        };

        const respondToSlack = async (ctx) => {
            let slackTimestamp = +ctx.headers['x-slack-request-timestamp'] * 1000;
            Sdk.debug('Slack request time', slackTimestamp);

            // URL Verification Challenge
            if (ctx.body && ctx.body.type && ctx.body.type === 'url_verification') {
                Sdk.debug('URL Verification Challenge');
                return { body: { challenge: ctx.body.challenge } };
            }

            // Call back to itself to dispatch, wait 100ms, and confirm success to slack
            // The async dispatch can run beyond the Slack's 3s limit

            try {
                Superagent.post(ctx.baseUrl + '/event?dispatch')
                    .set(ctx.headers)
                    .send(ctx.body)
                    .end();
                Sdk.debug('Dispatch request to self completed with success');
            } catch (e) {
                // We silently ignore errors here, have to look at realtime logs
                Sdk.debug('Dispatch request to self completed with error', e);
            }

            const response = await this.getSlackEventResponse(ctx, ctx.body);
            return new Promise((resolve) => {
                setTimeout(() => {
                    Sdk.debug('Responded to Slack', Date.now());
                    resolve(response);
                }, 100);
            });
        };

        const handleEvent = async (req, res) => {
            const ctx = req.fusebit;
            try {
                verifyRequestSignature({
                    signingSecret: ctx.configuration.slack_signing_secret,
                    requestSignature: ctx.headers['x-slack-signature'],
                    requestTimestamp: parseInt(ctx.headers['x-slack-request-timestamp'], 10),
                    // Slack escapes forward slashes in their body text as "\/"; this is stripped out during the JSON parsing.
                    // Add it back in so that the signature is calculated correctly.
                    body: JSON.stringify(ctx.body).replace(/\//g, '\\/'),
                });
            } catch (e) {
                Sdk.debug('New event signature verification failed', JSON.stringify(ctx.body, null, 2));
                return httpError(res, 403, 'Not authorized');
            }

            let response;
            try {
                if (ctx.query.dispatch !== undefined) {
                    Sdk.debug('Received Slack event from self for asynchronous processing');
                    response = (await this.onEvent(ctx, ctx.body)) || { status: 200 };
                } else {
                    Sdk.debug('Received new Slack event from Slack');
                    response = (await respondToSlack(ctx)) || { status: 200 };
                }
            } catch (e) {
                Sdk.debug(`Error processing Slack event: ${e.message}`);
                return httpError(res, 500, `Error processing Slack event: ${e.message}`);
            }
            res.status(response.status || 200);
            response.body ? res.json(response.body) : res.end();
        };

        // Send notification to a Slack user identified with Slack user ID
        app.post(
            '/notification/:slackUserId',
            authorizeNotificationRequest,
            async (req, res, next) => {
                req.params.userContext = await this.getUser(req.fusebit, req.params.slackUserId);
                next();
            },
            postNotification
        );

        // Send notification to a Slack user identified with a vendor user ID
        app.post(
            '/notification/:vendorId/:vendorUserId',
            authorizeNotificationRequest,
            async (req, res, next) => {
                req.params.userContext = await this.getUser(req.fusebit, req.params.vendorUserId, req.params.vendorId);
                next();
            },
            postNotification
        );

        // Accept events from Slack
        app.post('/event', (req, res) => {
            req.fusebit.configuration.slack_signing_secret
                ? handleEvent(req, res)
                : httpError(
                      res,
                      501,
                      `Not implemented. The connector is not configured to receive Slack events. Please specify the 'slack_signing_secret' configuration property and register the Request URL endpoint with Slack.`
                  );
        });
    }

    /**
     * Returns the response that is sent to Slack to confirm the receipt of an event. Processing of the event
     * is continuing asynchronously in the onEvent method. This is to allow event processing to take longer than 3 seconds,
     * which is the event processing timeout enforced by Slack.
     * @param {FusebitContext} fusebitContext The Fusebit context of the request
     * @param {*} event Slack event
     */
    async getSlackEventResponse(fusebitContext, event) {
        return { status: 200 };
    }

    /**
     * Called to asynchronously process a verified Slack event. Processing can take longer than the 3 second limit
     * imposed by Slack.
     * @param {FusebitContext} fusebitContext The Fusebit context of the request
     * @param {*} event Slack event
     */
    async onEvent(fusebitContext, event) {}

    /**
     * Implement this method to send a notification to Slack.
     * @param {FusebitContext} fusebitContext The Fusebit context of the request
     * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
     * from getAccessToken and getUserProfile, respectively.
     * @param {*} slack The Slack client, with `bot` and `user` (optional) properties.
     */
    async sendNotification(fusebitContext, userContext, slack) {
        return {
            status: 501,
            body: {
                status: 501,
                statusCode: 501,
                message: 'Not implemented. Please implement the VendorSlackConnector.sendNotification method.',
            },
        };
    }

    /**
     * Creates a Slack client for the specified user.
     * @param {FusebitContext} fusebitContext The Fusebit context of the request
     * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
     * from getAccessToken and getUserProfile, respectively.
     */
    async createSlackClient(fusebitContext, userContext) {
        const tokenContext = await this.ensureAccessToken(fusebitContext, userContext);
        const sdk = {
            bot: new WebClient(tokenContext.access_token),
            user:
                tokenContext.authed_user && tokenContext.authed_user.access_token
                    ? new WebClient(tokenContext.authed_user.access_token)
                    : undefined,
        };
        return sdk;
    }

    /**
     * Creates the fully formed web authorization URL to start the authorization flow.
     * @param {FusebitContext} fusebitContext The Fusebit context of the request
     * @param {string} state The value of the OAuth state parameter.
     * @param {string} redirectUri The callback URL to redirect to after the authorization flow.
     */
    async getAuthorizationUrl(fusebitContext, state, redirectUri) {
        return [
            'https://slack.com/oauth/v2/authorize',
            `?state=${state}`,
            `&client_id=${encodeURIComponent(fusebitContext.configuration.slack_client_id)}`,
            `&redirect_uri=${encodeURIComponent(redirectUri)}`,
            fusebitContext.configuration.slack_scope ? `&scope=${encodeURIComponent(fusebitContext.configuration.slack_scope)}` : undefined,
            fusebitContext.configuration.slack_user_scope
                ? `&user_scope=${encodeURIComponent(fusebitContext.configuration.slack_user_scope)}`
                : undefined,
        ].join('');
    }

    /**
     * Exchanges the OAuth authorization code for the access and refresh tokens.
     * @param {FusebitContext} fusebitContext The Fusebit context of the request
     * @param {string} authorizationCode The authorization_code supplied to the OAuth callback upon successful authorization flow.
     * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
     */
    async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        const response = await Superagent.post('https://slack.com/api/oauth.v2.access').type('form').send({
            code: authorizationCode,
            client_id: fusebitContext.configuration.slack_client_id,
            client_secret: fusebitContext.configuration.slack_client_secret,
            redirect_uri: redirectUri,
        });
        return response.body;
    }

    /**
     * Obtains the user profile given a freshly completed authorization flow. User profile will be stored along the token
     * context.
     * @param {*} tokenContext An object representing the result of the getAccessToken call. It contains access_token.
     */
    async getUserProfile(tokenContext) {
        const id =
            tokenContext.authed_user && tokenContext.authed_user.id
                ? this.getUniqueSlackUserId(tokenContext.team && tokenContext.team.id, tokenContext.authed_user.id)
                : this.getUniqueSlackUserId(tokenContext.team && tokenContext.team.id, tokenContext.bot_user_id, true);

        return {
            id,
            bot_id: tokenContext.bot_user_id,
            user_id: tokenContext.authed_user && tokenContext.authed_user.id,
            app_id: tokenContext.app_id,
            team_id: tokenContext.team && tokenContext.team.id,
        };
    }

    /**
     * Returns a unique Slack user ID that is used to identify a Slack user within this connector logic. Use this
     * identifier in all APIs that require vendorUserId.
     * @param {string} slackTeamId
     * @param {string} slackUserId
     * @param {boolean} isBotUser
     */
    getUniqueSlackUserId(slackTeamId, slackUserId, isBotUser) {
        return `${encodeURIComponent(slackTeamId)}/${isBotUser ? 'bot' : 'user'}/${encodeURIComponent(slackUserId)}`;
    }
}

exports.SlackConnector = SlackConnector;
