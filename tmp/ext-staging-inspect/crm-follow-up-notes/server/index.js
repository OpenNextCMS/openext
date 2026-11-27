/**
 * Trusted backend for crm-follow-up-notes.
 * Loaded only after an administrator approves trusted execution and enables the extension.
 */
module.exports = {
  async register(context) {
    context.logger.info('crm-follow-up-notes backend registered', {
      targetPluginId: context.targetPluginId
    });

    if (context.permissions.has('crm.followups.read')) {
      context.navigation.register({
        id: 'follow-ups-runtime',
        label: 'Follow-ups (runtime)',
        href: 'ui/pages/follow-ups.html'
      });
    }
  },

  async shutdown() {
    /* Host cleanup is owned by openext-crm-suite.extensionHost.unregisterExtension */
  }
};
