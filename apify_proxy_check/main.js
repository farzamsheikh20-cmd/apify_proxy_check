import { Actor, log } from 'apify';
import { ProxyAgent } from 'undici';

await Actor.init();
try {
  const proxy = await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'], countryCode: 'US' });
  if (!proxy) throw new Error('Residential proxy configuration unavailable');
  const proxyUrl = await proxy.newUrl();
  if (!proxyUrl) throw new Error('Could not obtain residential proxy URL');
  const agent = new ProxyAgent(proxyUrl);
  try {
    const response = await fetch('https://api.apify.com/v2/browser-info', {
      dispatcher: agent,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Diagnostic endpoint returned HTTP ${response.status}`);
    const result = await response.json();
    const report = {
      requestedProxyGroup: 'RESIDENTIAL',
      requestedCountry: 'US',
      exitIp: result.clientIp ?? null,
      observedCountry: result.countryCode ?? null,
      status: result.countryCode === 'US' ? 'US residential proxy routing verified' : 'Country differs from US; investigate proxy configuration',
    };
    log.info('Proxy check result', report);
    await Actor.setValue('PROXY_CHECK', report);
  } finally {
    await agent.close();
  }
} finally {
  await Actor.exit();
}
