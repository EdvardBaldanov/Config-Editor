/**
 * Quick Deployer Plugin
 * Consumes the 'ssh' inter-plugin service via Core Proxy Bridge.
 */
(function() {
  const pluginId = 'quick-deploy';
  if (!window.ConfigStudio || !window.ConfigStudio.services) return;

  // Request the 'ssh' service through secure bridge
  window.ConfigStudio.services.get('ssh', pluginId)
    .then(ssh => {
      console.log('[QuickDeploy] Successfully connected to SSH service bridge:', ssh);
    })
    .catch(err => {
      console.warn('[QuickDeploy] Service access notice:', err.message);
    });
})();
