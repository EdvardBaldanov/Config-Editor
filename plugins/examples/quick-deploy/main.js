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

  // Register contextual action in File Explorer
  if (window.ConfigStudio.registerContextMenu) {
    window.ConfigStudio.registerContextMenu({
      id: 'quick-deploy.run',
      pluginId: pluginId,
      label: 'Deploy with SSH...',
      icon: 'Play',
      group: 'tools',
      order: 20,
      targetType: 'file',
      fileMatches: ['*.yml', '*.yaml', '*.conf', 'Makefile*'],
      onClick: (target) => {
        if (window.ConfigStudio.showNotification) {
          window.ConfigStudio.showNotification(`Deploying ${target.name} via SSH...`, 'info');
        } else {
          alert(`Deploying ${target.name} via SSH...`);
        }
      },
    });
  }
})();
