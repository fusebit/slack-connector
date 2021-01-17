const { SlackConnector } = require('./SlackConnector');
const { createOAuthConnector } = require('@fusebit/oauth-connector');

exports.SlackConnector = SlackConnector;
exports.createSlackConnector = createOAuthConnector;
