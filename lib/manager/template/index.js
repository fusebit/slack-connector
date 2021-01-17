const { VendorSlackConnector } = require('./VendorSlackConnector');
const { createSlackConnector } = require('@fusebit/slack-connector');

module.exports = createSlackConnector(new VendorSlackConnector());
