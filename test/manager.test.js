const {
  getCredentials,
  createCtx,
  cleanup,
  testBoundaryId,
  testFunctionId1,
  testFunctionId2,
  getFunction,
} = require('./common');
const manager = require('../lib/manager');
const Fs = require('fs');
const Path = require('path');

const profile = getCredentials();

const installCtx = createCtx(
  {
    method: 'POST',
    body: {
      baseUrl: profile.baseUrl,
      accountId: profile.account,
      subscriptionId: profile.subscription,
      boundaryId: testBoundaryId,
      functionId: testFunctionId2,
      templateName: 'test-template-name',
      configuration: {
        slack_client_id: '{slack_client_id}',
        slack_client_secret: '{slack_client_secret}',
        slack_signing_secret: '{slack_signing_secret}',
        slack_scope: '{slack_scope}',
        slack_user_scope: '{slack_user_scope}',
        fusebit_settings_managers: '{fusebit_settings_managers}',
        fusebit_allowed_return_to: '{fusebit_allowed_return_to}',
      },
      metadata: {
        template: {
          managerUrl: '{managerUrl}',
        },
      },
    },
    configuration: {
      fusebit_allowed_return_to: '*',
    },
  },
  {
    path: `/install`,
  }
);

const uninstallCtx = createCtx(
  {
    method: 'POST',
    body: {
      baseUrl: profile.baseUrl,
      accountId: profile.account,
      subscriptionId: profile.subscription,
      boundaryId: testBoundaryId,
      functionId: testFunctionId2,
      templateName: 'test-template-name',
    },
    configuration: {
      fusebit_allowed_return_to: '*',
    },
  },
  {
    path: `/uninstall`,
  }
);

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
        })
      ).toString('base64'),
    },
    configuration: {
      fusebit_allowed_return_to: '*',
    },
  },
  {
    path: `/configure`,
  }
);

describe('manager', () => {
  beforeAll(async () => cleanup());
  afterEach(async () => cleanup());

  test('Manager is an async function', async () => {
    expect(typeof manager).toBe('function');
    expect(manager.constructor.name).toBe('AsyncFunction');
  });

  test('The /configure endpoint returns HTML', async () => {
    const ctx = configureCtx;
    const response = await manager(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    expect(response.headers['content-type']).toBe('text/html');
    expect(response.bodyEncoding).toBe('utf8');
  });

  test('The /install endpoint creates the connector', async () => {
    const ctx = installCtx;
    let response = await manager(ctx);
    expect([200, 201]).toContain(response.status);
    response = await getFunction(testBoundaryId, testFunctionId2);
    expect(response.status).toBe(200);
    expect(response.body.configuration).toMatchObject(ctx.body.configuration);
    expect(response.body.metadata).toMatchObject(ctx.body.metadata);
    expect(response.body.security).toMatchObject({
      functionPermissions: {
        allow: [
          {
            action: 'storage:*',
            resource: `/account/${profile.account}/subscription/${profile.subscription}/storage/boundary/${testBoundaryId}/function/${testFunctionId2}/`,
          },
          {
            action: 'function:*',
            resource: `/account/${profile.account}/subscription/${profile.subscription}/`,
          },
        ],
      },
      authentication: 'optional',
    });
    expect(response.body.nodejs.files['index.js']).toBe(
      Fs.readFileSync(Path.join(__dirname, '..', 'lib/manager/template/index.js')).toString()
    );
    expect(response.body.nodejs.files['VendorSlackConnector.js']).toBe(
      Fs.readFileSync(Path.join(__dirname, '..', 'lib/manager/template/VendorSlackConnector.js')).toString()
    );
  });

  test('The /uninstall endpoint deletes the connector', async () => {
    let ctx = installCtx;
    let response = await manager(ctx);
    expect([200, 201]).toContain(response.status);
    response = await getFunction(testBoundaryId, testFunctionId2);
    expect(response.status).toBe(200);
    ctx = uninstallCtx;
    response = await manager(ctx);
    expect([204]).toContain(response.status);
    response = await getFunction(testBoundaryId, testFunctionId2);
    expect(response.status).toBe(404);
  });
});
