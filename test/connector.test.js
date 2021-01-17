const mockConnector = require('..');
// This is to allow the VendorSlackConnector.js to load @fusebit/slack-connector:
const connector = mockConnector;
jest.mock('@fusebit/slack-connector', () => mockConnector, { virtual: true });

const { getCredentials, createCtx, cleanup, testBoundaryId, testFunctionId1, testFunctionId2, getStorage } = require('./common');
const Url = require('url');

const profile = getCredentials();

const configureCtx = createCtx(
    {
        query: {
            returnTo: 'https://contoso.com',
            state: 'abc',
            data: Buffer.from(
                JSON.stringify({
                    baseUrl: profile.baseUrl,
                    accountId: profile.account,
                    subscriptionId: profile.subscription,
                    boundaryId: testBoundaryId,
                    functionId: testFunctionId2,
                    templateName: 'test-template-name',
                    foobar_oauth_user_id: 'u123',
                    foobar_oauth_connector_base_url: 'https://idontexist',
                })
            ).toString('base64'),
        },
        configuration: {
            slack_client_id: '{slack_client_id}',
            slack_client_secret: '{slack_client_secret}',
            slack_signing_secret: '{slack_signing_secret}',
            slack_scope: '{slack_scope}',
            slack_user_scope: '{slack_user_scope}',
            fusebit_allowed_return_to: '{fusebit_allowed_return_to}',
            vendor_name: 'Slack',
            vendor_prefix: 'slack',
            fusebit_allowed_return_to: '*',
        },
    },
    {
        path: `/configure`,
    }
);

const configureWithSettingsManagerCtx = {
    ...configureCtx,
    configuration: {
        ...configureCtx.configuration,
        fusebit_settings_managers: 'https://settings.manager.com',
    },
};

const callbackCtx = (state) =>
    createCtx(
        {
            query: {
                code: 'abc',
                state,
            },
            configuration: {
                slack_client_id: '123',
                slack_client_secret: '456',
                slack_signing_secret: '789',
                slack_scope: 'sample-scope',
                slack_user_scope: 'sample-user-scope',
                vendor_name: 'Slack',
                vendor_prefix: 'slack',
                fusebit_allowed_return_to: '*',
            },
        },
        {
            path: `/callback`,
        }
    );

const getTokenCtx = createCtx(
    {
        configuration: {
            slack_client_id: '123',
            slack_client_secret: '456',
            slack_signing_secret: '789',
            slack_scope: 'sample-scope',
            slack_user_scope: 'sample-user-scope',
            vendor_name: 'Slack',
            vendor_prefix: 'slack',
            fusebit_allowed_return_to: '*',
        },
        caller: {
            permissions: {
                allow: [
                    {
                        action: '*',
                        resource: '/',
                    },
                ],
            },
        },
    },
    {
        path: `/user/789/token`,
    }
);

const getUserCtx = createCtx(
    {
        configuration: {
            slack_client_id: '123',
            slack_client_secret: '456',
            slack_signing_secret: '789',
            slack_scope: 'sample-scope',
            slack_user_scope: 'sample-user-scope',
            vendor_name: 'Slack',
            vendor_prefix: 'slack',
            fusebit_allowed_return_to: '*',
        },
        caller: {
            permissions: {
                allow: [
                    {
                        action: '*',
                        resource: '/',
                    },
                ],
            },
        },
    },
    {
        path: `/user/789`,
    }
);

const getForeignUserCtx = createCtx(
    {
        configuration: {
            slack_client_id: '123',
            slack_client_secret: '456',
            slack_signing_secret: '789',
            slack_scope: 'sample-scope',
            slack_user_scope: 'sample-user-scope',
            vendor_name: 'Slack',
            vendor_prefix: 'slack',
            fusebit_allowed_return_to: '*',
        },
        caller: {
            permissions: {
                allow: [
                    {
                        action: '*',
                        resource: '/',
                    },
                ],
            },
        },
    },
    {
        path: `/foreign-user/foobar/u123`,
    }
);

const postNotificationCtx = createCtx(
    {
        method: 'POST',
        body: {
            text: 'hello, world',
        },
        configuration: {
            slack_client_id: '123',
            slack_client_secret: '456',
            slack_signing_secret: '789',
            slack_scope: 'sample-scope',
            slack_user_scope: 'sample-user-scope',
            vendor_name: 'Slack',
            vendor_prefix: 'slack',
            fusebit_allowed_return_to: '*',
        },
        caller: {
            permissions: {
                allow: [
                    {
                        action: '*',
                        resource: '/',
                    },
                ],
            },
        },
    },
    {
        path: `/notification1/789`,
    }
);

const deleteUserCtx = createCtx(
    {
        method: 'DELETE',
        configuration: {
            slack_client_id: '123',
            slack_client_secret: '456',
            slack_signing_secret: '789',
            slack_scope: 'sample-scope',
            slack_user_scope: 'sample-user-scope',
            vendor_name: 'Slack',
            vendor_prefix: 'slack',
            fusebit_allowed_return_to: '*',
        },
        caller: {
            permissions: {
                allow: [
                    {
                        action: '*',
                        resource: '/',
                    },
                ],
            },
        },
    },
    {
        path: `/user/789`,
    }
);

describe('connector', () => {
    beforeAll(async () => cleanup());
    afterEach(async () => cleanup());

    test('Connector module has correct exports', async () => {
        expect(typeof connector.createSlackConnector).toBe('function');
        expect(typeof connector.SlackConnector).toBe('function');
    });

    test('createSlackConnector returns an async function for base SlackConnector', async () => {
        const handler = connector.createSlackConnector(new connector.SlackConnector());
        expect(typeof handler).toBe('function');
        expect(handler.constructor.name).toBe('AsyncFunction');
    });

    test('createSlackConnector returns an async function for derived VendorSlackConnector', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        const handler = connector.createSlackConnector(new VendorSlackConnector());
        expect(typeof handler).toBe('function');
        expect(handler.constructor.name).toBe('AsyncFunction');
    });

    test('The /configure endpoint returns HTML by default', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        const handler = connector.createSlackConnector(new VendorSlackConnector());
        const ctx = configureCtx;
        const response = await handler(ctx);
        expect(response.status).toBe(200);
        expect(typeof response.body).toBe('string');
        expect(response.headers['content-type']).toMatch('text/html');
        expect(response.bodyEncoding).toBe('utf8');
    });

    test('The /configure endpoint returns a redirect when no initial HTML is specified', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
        }
        const handler = connector.createSlackConnector(new TestSlackConnector());
        const ctx = configureCtx;
        const response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        const url = Url.parse(response.headers.location, true);
        expect(url.protocol).toBe('https:');
        expect(url.host).toBe('slack.com');
        expect(url.pathname).toBe('/oauth/v2/authorize');
        expect(url.query.client_id).toBe('{slack_client_id}');
        expect(url.query.scope).toBe('{slack_scope}');
        expect(url.query.user_scope).toBe('{slack_user_scope}');
        expect(url.query.state).toBeDefined();
        expect(url.query.redirect_uri).toBe(
            `${profile.baseUrl}/v1/run/${profile.subscription}/${testBoundaryId}/${testFunctionId1}/callback`
        );
    });

    test('The /configure endpoint returns a redirect when custom settings manager is specified', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        const handler = connector.createSlackConnector(new VendorSlackConnector());
        const ctx = configureWithSettingsManagerCtx;
        const response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        const url = Url.parse(response.headers.location, true);
        expect(url.protocol).toBe('https:');
        expect(url.host).toBe('settings.manager.com');
        expect(url.pathname).toBe('/');
        expect(url.query.returnTo).toBe(`${configureWithSettingsManagerCtx.baseUrl}/configure`);
        expect(JSON.parse(Buffer.from(url.query.state, 'base64').toString())).toMatchObject({
            configurationState: 'settingsManagers',
            returnTo: 'https://contoso.com',
            returnToState: 'abc',
            settingsManagersStage: 1,
        });
        expect(url.query.data).toBe(configureWithSettingsManagerCtx.query.data);
    });

    test('The /callback endpoint logs in vendor user and returns a redirect with successful response', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        const accessToken = {
            bot_user_id: 'b123',
            authed_user: {
                access_token: `user-access-token:abc`,
                id: 'u890',
            },
            app_id: 'a123',
            team: { id: 't123' },
            // access_token: `bot-access-token:${authorizationCode}`,
            expires_in: 10000,
        };
        const uniqueUserId = 't123/user/u890';
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    ...accessToken,
                    access_token: `bot-access-token:${authorizationCode}`,
                };
            }
            async onConfigurationComplete(ctx, userContext, data) {
                await super.onConfigurationComplete(ctx, userContext, data);
                userContext.foo = 'bar';
                userContext.dataPassedToBindUser = data;
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        // Process the /callback and pass the 'state' parameter from the response to /configure
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Validate the redirect URL query params
        expect(typeof response.headers.location).toBe('string');
        url = Url.parse(response.headers.location, true);
        expect(url.protocol).toBe('https:');
        expect(url.host).toBe('contoso.com');
        expect(url.pathname).toBe('/');
        expect(url.query.status).toBe('success');
        expect(url.query.state).toBe('abc');
        expect(url.query.data).toBeDefined();
        // Validate the 'data' that would normally be passed back to the add-on handler on installation:
        const data = JSON.parse(Buffer.from(url.query.data, 'base64'));
        expect(data).toMatchObject({
            slack_oauth_user_id: uniqueUserId,
            slack_oauth_connector_base_url: `${profile.baseUrl}/v1/run/${profile.subscription}/${testBoundaryId}/${testFunctionId1}`,
        });
        // Validate storage content for the logged in user
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser(data.slack_oauth_user_id));
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.status).toBe('authenticated');
        expect(response.body.data.timestamp).toBeDefined();
        expect(response.body.data.vendorToken).toBeDefined();
        expect(response.body.data.vendorToken.access_token).toBe('bot-access-token:abc');
        expect(response.body.data.vendorToken.expires_in).toBe(10000);
        expect(response.body.data.vendorToken.expires_at).toBeDefined();
        expect(response.body.data.vendorUserId).toBe(data.slack_oauth_user_id);
        expect(response.body.data.vendorUserProfile).toBeDefined();
        expect(response.body.data.foreignOAuthIdentities).toBeDefined();
        expect(response.body.data.foreignOAuthIdentities.foobar).toBeDefined();
        expect(response.body.data.foreignOAuthIdentities.foobar.userId).toBe('u123');
        expect(response.body.data.foreignOAuthIdentities.foobar.connectorBaseUrl).toBe('https://idontexist');
        expect(response.body.data.foo).toBe('bar');
        expect(response.body.data.dataPassedToBindUser).toMatchObject(
            JSON.parse(Buffer.from(configureCtx.query.data, 'base64').toString())
        );
        // Validate getUser works for the connector user
        const user = await oAuthConnector.getUser(configureCtx, data.slack_oauth_user_id);
        expect(user).toMatchObject(response.body.data);
        // Validate stoage content for the foreign keys
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('u123', 'foobar'));
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.vendorUserId).toBe(data.slack_oauth_user_id);
        // Validate getUser works for the foreign user
        const user1 = await oAuthConnector.getUser(configureCtx, 'u123', 'foobar');
        expect(user1).toMatchObject(user);
        // Validate ensureAccessToken works for the connector user
        response = await oAuthConnector.ensureAccessToken(configureCtx, user);
        expect(response).toBeDefined();
        expect(response.access_token).toBe('bot-access-token:abc');
        expect(response.expires_in).toBe(10000);
        expect(response.expires_at).toBeDefined();
        // Validate ensureAccessToken throws for foreign user
        try {
            await oAuthConnector.ensureAccessToken(configureCtx, user, 'foobar');
            throw new Error('Passed');
        } catch (e) {
            expect(e.message).toMatch(/ENOTFOUND idontexist/);
        }
        // Validate delete user cleans storage
        await oAuthConnector.deleteUser(configureCtx, data.slack_oauth_user_id);
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser(data.slack_oauth_user_id));
        expect(response.status).toBe(404);
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('u123', 'foobar'));
        expect(response.status).toBe(404);
    });

    test('The /callback endpoint returns error when onNewUser throws', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    access_token: `access-token:${authorizationCode}`,
                    expires_in: 10000,
                };
            }
            async getUserProfile(tokenContext) {
                return { id: '789' };
            }
            async onNewUser(ctx, userContext) {
                throw new Error('A completely unexpected error');
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        // Process the /callback and pass the 'state' parameter from the response to /configure
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Validate the redirect URL query params
        expect(typeof response.headers.location).toBe('string');
        url = Url.parse(response.headers.location, true);
        expect(url.protocol).toBe('https:');
        expect(url.host).toBe('contoso.com');
        expect(url.pathname).toBe('/');
        expect(url.query.status).toBe('error');
        expect(url.query.state).toBe('abc');
        expect(url.query.data).toBeDefined();
        // Validate the 'data' that would normally be passed back to the add-on handler on installation:
        const data = JSON.parse(Buffer.from(url.query.data, 'base64'));
        expect(data).toMatchObject({
            message: 'Error initializing new user: A completely unexpected error',
            status: 500,
        });
        // Validate storage content for the logged in user does not exist
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('789'));
        expect(response.status).toBe(404);
        // Validate stoage content for the foreign keys does not exist
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('u123', 'foobar'));
        expect(response.status).toBe(404);
    });

    test('The /user/:vendorUserId/token endpoint returns access token', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    access_token: `access-token:${authorizationCode}`,
                    expires_in: 10000,
                };
            }
            async getUserProfile(tokenContext) {
                return { id: '789' };
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Get the current access token for the logged in user
        ctx = getTokenCtx;
        response = await handler(ctx);
        expect(response.status).toBe(200);
        expect(typeof response.body).toBe('string');
        const body = JSON.parse(response.body);
        expect(body.access_token).toBe('access-token:abc');
        expect(body.expires_in).toBe(10000);
        expect(body.expires_at).toBeDefined();
    });

    test('The GET /user/:vendorUserId endpoint returns user data', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    access_token: `access-token:${authorizationCode}`,
                    expires_in: 10000,
                };
            }
            async getUserProfile(tokenContext) {
                return { id: '789' };
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Get the user
        ctx = getUserCtx;
        response = await handler(ctx);
        expect(response.status).toBe(200);
        expect(typeof response.body).toBe('string');
        const body = JSON.parse(response.body);
        expect(body.status).toBe('authenticated');
        expect(body.vendorUserId).toBe('789');
        expect(body.vendorUserProfile).toMatchObject({ id: '789' });
        expect(body.timestamp).toBeDefined();
        expect(body.vendorToken).toBeDefined();
        expect(body.vendorToken.access_token).toBe('access-token:abc');
        expect(body.vendorToken.expires_in).toBe(10000);
        expect(body.vendorToken.expires_at).toBeDefined();
    });

    test('The GET /foreign-user/:vendorId/:vendorUserId endpoint returns user data', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    access_token: `access-token:${authorizationCode}`,
                    expires_in: 10000,
                };
            }
            async getUserProfile(tokenContext) {
                return { id: '789' };
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Get the user
        ctx = getForeignUserCtx;
        response = await handler(ctx);
        expect(response.status).toBe(200);
        expect(typeof response.body).toBe('string');
        const body = JSON.parse(response.body);
        expect(body.status).toBe('authenticated');
        expect(body.vendorUserId).toBe('789');
        expect(body.vendorUserProfile).toMatchObject({ id: '789' });
        expect(body.timestamp).toBeDefined();
        expect(body.vendorToken).toBeDefined();
        expect(body.vendorToken.access_token).toBe('access-token:abc');
        expect(body.vendorToken.expires_in).toBe(10000);
        expect(body.vendorToken.expires_at).toBeDefined();
    });

    test('The DELETE /user/:vendorUserId endpoint deletes the user', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    access_token: `access-token:${authorizationCode}`,
                    expires_in: 10000,
                };
            }
            async getUserProfile(tokenContext) {
                return { id: '789' };
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Delete the user
        ctx = deleteUserCtx;
        response = await handler(ctx);
        expect(response.status).toBe(204);
        // Validate storage content for the deleted user is deleted
        response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('789'));
        expect(response.status).toBe(404);
        // Validate the GET user returns 404
        ctx = getUserCtx;
        response = await handler(ctx);
        expect(response.status).toBe(404);
    });

    test('The custom POST /notification1/:vendorUserId endpoint succeeds', async () => {
        const { VendorSlackConnector } = require('../lib/manager/template/VendorSlackConnector');
        class TestSlackConnector extends VendorSlackConnector {
            async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
                return undefined;
            }
            async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
                return {
                    access_token: `access-token:${authorizationCode}`,
                    expires_in: 10000,
                };
            }
            async getUserProfile(tokenContext) {
                return { id: '789' };
            }
            onCreate(app) {
                app.post(
                    '/notification1/:vendorUserId',
                    this.authorize({
                        action: 'function:execute',
                        resourceFactory: (req) =>
                            `/account/${req.fusebit.accountId}/subscription/${req.fusebit.subscriptionId}/boundary/${
                                req.fusebit.boundaryId
                            }/function/${req.fusebit.functionId}/notification/${encodeURIComponent(req.params.vendorUserId)}/`,
                    }),
                    async (req, res, next) => {
                        // Check if the user with the specifed ID has previously authenticated
                        const userContext = await this.getUser(req.fusebit, req.params.vendorUserId);
                        if (!userContext) {
                            res.status(404);
                            res.end();
                        } else {
                            // Ensure the access token for the user is current
                            const tokenContext = await this.ensureAccessToken(req.fusebit, userContext);
                            res.status(200);
                            res.json({
                                userId: req.params.vendorUserId,
                                accessToken: tokenContext.access_token,
                                payload: req.fusebit.body,
                            });
                        }
                    }
                );
            }
        }
        const oAuthConnector = new TestSlackConnector();
        const handler = connector.createSlackConnector(new TestSlackConnector());
        let ctx = configureCtx;
        // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
        let response = await handler(ctx);
        expect(response.status).toBe(302);
        expect(response.headers).toBeDefined();
        expect(typeof response.headers.location).toBe('string');
        let url = Url.parse(response.headers.location, true);
        expect(url.query.state).toBeDefined();
        ctx = callbackCtx(url.query.state);
        response = await handler(ctx);
        expect(response.status).toBe(302);
        // Post notification
        ctx = postNotificationCtx;
        response = await handler(ctx);
        expect(response.status).toBe(200);
        expect(typeof response.body).toBe('string');
        const body = JSON.parse(response.body);
        expect(body.userId).toBe('789');
        expect(body.accessToken).toBe('access-token:abc');
        expect(body.payload).toBeDefined();
        expect(body.payload.text).toBe('hello, world');
    });
});
