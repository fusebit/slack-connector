const { SlackConnector } = require('@fusebit/slack-connector');
const Superagent = require('superagent');

class VendorSlackConnector extends SlackConnector {
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
    // // Add a custom route that enables an authorized caller to make calls to Slack APIs
    // app.post(
    //     '/my-api/:vendorId/:vendorUserId',
    //     this.authorize({
    //         action: 'function:execute',
    //         resourceFactory: (req) =>
    //             `/account/${req.fusebit.accountId}/subscription/${req.fusebit.subscriptionId}/boundary/${req.fusebit.boundaryId}/function/${req.fusebit.functionId}/`,
    //     }),
    //     async (req, res, next) => {
    //         // Check if the user with the specifed ID has previously authenticated
    //         const userContext = await this.getUser(req.fusebit, req.params.vendorUserId, req.params.vendorId);
    //         if (!userContext) {
    //             res.status(404);
    //         } else {
    //             // Ensure the access token for the user is current
    //             const slack = this.createSlackClient(req.fusebit, userContext);
    //             // Use slack client to call Slack APIs...
    //             console.log(`Calling Slack APIs...`);
    //             res.status(200);
    //         }
    //         res.end();
    //     }
    // );
  }

  /**
   * Called when the entire connector is being deleted. Override the logic in this method to remove
   * any artifacts created during the lifetime of this connector (e.g. Fusebit functions, storage).
   * @param {FusebitContext} fusebitContext The Fusebit context
   */
  async onDelete(fusebitContext) {
    await super.onDelete(fusebitContext);
  }

  /**
   * Called after a new user successfuly completed a configuration flow and was persisted in the system. This extensibility
   * point allows for creation of any artifacts required to serve this new user, for example creation of additional
   * Fusebit functions.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   */
  async onNewUser(fusebitContext, userContext) {
    await super.onNewUser(fusebitContext, userContext);
  }

  /**
   * Deletes all artifacts associated with a vendor user. This is an opportunity to remove any artifacts created in
   * onNewUser, for example Fusebit functions.
   * @param {FusebitContext} fusebitContext The Fusebit context
   * @param {string} vendorUserId The vendor user id
   * @param {string} vendorId If specified, vendorUserId represents the identity of the user in another system.
   * The vendorId must correspond to an entry in userContext.foreignOAuthIdentities.
   */
  async deleteUser(fusebitContext, vendorUserId, vendorId) {
    await super.deleteUser(fusebitContext, vendorUserId, vendorId);
  }

  /**
   * Implement this method to send a notification to Slack.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   * @param {*} slack The Slack client, with `bot` and `user` (optional) properties.
   */
  async sendNotification(fusebitContext, userContext, slack) {
    // If user access token was requested in addition to bot access token, you can
    // replace `slack.bot` with `slack.user` below to act on behalf of the user. If no
    // user access token is present, `slack.user` will be undefined.

    const conversations = await slack.bot.conversations.list();
    const channel = conversations.channels.filter((c) => c.name === 'general');
    if (channel && channel.length > 0) {
      const result = await slack.bot.chat.postMessage({
        text: `Hello world at ${new Date()}`,
        channel: channel[0].id,
      });

      const message = `Successfully sent message ${result.ts} in conversation ${channel[0].name}`;
      console.log(message);
      return { status: 200, body: message };
    }
    return { status: 404, body: { status: 404, statusCode: 404, message: 'The `general` channel was not found.' } };
  }

  /**
   * Returns the response that is immediately sent to Slack to confirm the receipt of an event. This method is expected
   * to return quickly - processing of the event will continue asynchronously in the onEvent method.
   * This is to allow event processing to take longer than 3 seconds, which is the event processing timeout enforced
   * by Slack.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} event Slack event
   */
  async getSlackEventResponse(fusebitContext, event) {
    // Default implementation responds with HTTP 200.
    return super.getSlackEventResponse(fusebitContext, event);
  }

  /**
   * Called to asynchronously process a verified Slack event. Processing can take longer than the 3 second limit
   * imposed by Slack. Slack event schema is documented at https://api.slack.com/types/event.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} event Slack event
   */
  async onEvent(fusebitContext, event) {
    console.log('ON EVENT', JSON.stringify(event, null, 2));
    // const slackUserId = event.authed_users[0]; // ...or determine the sender from specific event payload
    // const userContext = await this.getUser(this.getUniqueSlackUserId(event.team_id, slackUserId));
    // if (userContext) {
    //     // User is authenticated in the system

    //     const slack = await this.createSlackClient(fusebitContext, userContext);
    //     // Call Slack APIs...

    //     const contosoAccessToken = await this.ensureAccessToken(fusebitContext, userContext, 'contoso');
    //     // Call Contoso APIs...
    // }
  }

  /**
   * Returns the HTML of the web page that initiates the authorization flow to the authorizationUrl. Return
   * undefined if you don't want to present any HTML to the user but instead redirect the user directly to
   * the authorizationUrl.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {string} authorizationUrl The fully formed authorization url to redirect the user to
   */
  async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
    return super.getAuthorizationPageHtml(fusebitContext, authorizationUrl);
  }

  /**
   * Gets the health status of the user
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   */
  async getHealth(fusebitContext, userContext) {
    // The default implementation returns success if the bot access token of the user can be used to communicate with Slack
    return super.getHealth(fusebitContext, userContext);
  }
}

module.exports.VendorSlackConnector = VendorSlackConnector;
