/*
This is the state machine that describes the configuration logic of the Lifecycle Manager. 
*/

const Sdk = require('@fusebit/add-on-sdk');
const form = require('fs').readFileSync(__dirname + '/form.html', {
    encoding: 'utf8',
});

module.exports = {
    initialState: 'form',
    states: {
        form: async (ctx, state, data) => {
            // Render a simple HTML form to collect configuration parameters required by the Add-On.
            // The form will perform a client-side redirect back to the `ctx.query.returnTo`, which is
            // the application that initiated the configuration flow. The application will normally
            // continue the Add-On installation by invoking the /install endpoint on the Lifecycle Manager.

            const view = form
                .replace(/##templateName##/g, data.templateName)
                .replace(/##returnTo##/, JSON.stringify(state.returnTo))
                .replace(/##data##/, JSON.stringify(data))
                .replace(/##state##/, state.returnToState ? JSON.stringify(state.returnToState) : 'null');

            return {
                body: view,
                bodyEncoding: 'utf8',
                headers: { 'content-type': 'text/html' },
                status: 200,
            };
        },
    },
};
