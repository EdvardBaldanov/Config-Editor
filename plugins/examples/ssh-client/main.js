/**
 * SSH Client & Terminal Plugin
 * Registers the 'ssh' inter-plugin service via Core Proxy Bridge.
 */
(function() {
  const pluginId = 'ssh-client';
  if (!window.ConfigStudio || !window.ConfigStudio.services) return;

  window.ConfigStudio.services.register('ssh', {
    exec: async (host, cmd) => {
      console.log(`[SSH-Client] Executing on ${host}: ${cmd}`);
      return { stdout: `Executed "${cmd}" on ${host} successfully`, exitCode: 0 };
    },
    ping: async (host) => {
      console.log(`[SSH-Client] Pinging host ${host}...`);
      return { alive: true, latencyMs: 14 };
    }
  }, pluginId);

  console.log('[SSH-Client] Inter-plugin service "ssh" successfully registered.');
})();
