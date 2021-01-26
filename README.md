# Fusebit Slack Connector

This is the Fusebit Slack Connector, a simple way to to implement a multi-tenant, bi-directional integration between your application and Slack, on top of the [Fusebit](https://fusebit.io) platform.

## Getting started

Assuming you are a subscriber of [Fusebit](https://fusebit.io), you would start by using the `fuse` CLI to deploy a Fusebit Slack Connector Manager to your subscription:

```
git clone git@github.com:fusebit/slack-connector.git
cd slack-connector
fuse function deploy --boundary managers slack-connector-manager -d ./fusebit
```

Soon enough you will be writing code of your integration logic. Get in touch at [Fusebit](https://fusebit.io) for further instructions or to learn more.

## Organization

- `lib/connector` contains the core Fusebit Slack Connector logic that manages authentication to Slack.
- `lib/manager` contains the Fusebit Slack Connector Manager logic which supports the install/uninstall/configure operations for the connector.
- `lib/manager/template` contains a template of a Fusebit Function that exposes the Fusebit Slack Connector interface. As a developer, you will be spending most of your time focusing on adding your integration logic to [VendorSlackConnector.js](https://github.com/fusebit/slack-connector/blob/main/lib/manager/template/VendorSlackConnector.js).
- `fusebit` contains a template of a Fusebit Function that exposes the Fusebit Slack Connector Manager interface.

## Running tests

Here are a few things you need to know before running tests:

- You must have access to a [Fusebit](https://fusebit.io) subscription.
- You must have the [Fusebit CLI](https://fusebit.io/docs/reference/fusebit-cli/) installed.
- You must have a Fusebit CLI profile configured with an account ID and subscription ID, and sufficient permissions to manage all functions and all storage on that subscription.
- The test will create and remove functions in randomly named boundary in the subscription.
- The test will create and remove storage objects in randomly named storage ID in the subscription.

To run the tests, set the `FUSE_PROFILE` environment variable to the Fusebit CLI profile name to use:

```
FUSE_PROFILE={profile-name} npm test
```

In case of a failure, you can get useful, verbose diagnostic information with:

```
debug=1 FUSE_PROFILE={profile-name} npm test
```

## Release notes

### 1.0.5

- Fix refreshToken logic bugs with upgrade to @fusebit/oauth-connector to 1.2.5

### 1.0.4

- Fix big in the callback page of /test with upgrade to @fusebit/oauth-connector to 1.2.1

### 1.0.3

- Support test page at /test with an upgrade to @fusebit/oauth-connector to 1.2.0

### 1.0.2

- Update dependency on @fusebit/oauth-connector to 1.1.1

### 1.0.1

- Fix bug to delete connector's storage when the connector is deleted.

### v1.0.0

- Initial implementation.
