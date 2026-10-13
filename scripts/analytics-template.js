/* Existing LeanCloud counters; previews only read and never increment. */
(async function () {
  const config = ANALYTICS_CONFIG;
  const settings = config.leancloud;
  const live = config.enable && location.hostname === 'spricoder.github.io' && !new URLSearchParams(location.search).has('preview');
  const targets = [
    { target: 'site-pv', element: 'leancloud-site-pv', container: 'leancloud-site-pv-container', increment: live },
    { target: 'site-uv', element: 'leancloud-site-uv', container: 'leancloud-site-uv-container', increment: false },
  ];
  const page = document.getElementById('leancloud-page-views-container');
  if (page) {
    const originalPath = page.dataset.counterPath || location.pathname;
    targets.push({ target: decodeURI(originalPath.replace(/\/*(index.html)?$/, '/')), element: 'leancloud-page-views', container: 'leancloud-page-views-container', increment: live });
  }
  if (live) {
    try {
      const key = 'LeanCloud_UV_Flag';
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last > 86400000) {
        targets[1].increment = true;
        localStorage.setItem(key, String(Date.now()));
      }
    } catch { /* Without browser storage, do not inflate unique visitor counts. */ }
  }
  let server = settings.server_url;
  try {
    if (!server) {
      const response = await fetch('https://app-router.leancloud.cn/2/route?appId=' + encodeURIComponent(settings.app_id));
      if (!response.ok) throw new Error('Analytics route unavailable');
      server = (await response.json()).api_server;
    }
    server = /^https?:\/\//.test(server) ? server : `https://${server}`;
    server = server.replace(/\/$/, '');
    async function request(method, endpoint, data) {
      const response = await fetch(`${server}/1.1${endpoint}`, {
        method,
        headers: { 'X-LC-Id': settings.app_id, 'X-LC-Key': settings.app_key, 'Content-Type': 'application/json' },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      if (!response.ok) throw new Error('Analytics request unavailable');
      return response.json();
    }
    const increments = [];
    await Promise.all(targets.map(async item => {
      if (!document.getElementById(item.element)) return;
      const existingId = config.counter_ids?.[item.target];
      const result = await request('GET', existingId ? '/classes/Counter/' + existingId : '/classes/Counter?limit=1&where=' + encodeURIComponent(JSON.stringify({ target: item.target })));
      let record = existingId ? result : result.results?.[0];
      if (!record && live) record = await request('POST', '/classes/Counter', { target: item.target, time: 0 });
      if (!record) return;
      if (item.increment) increments.push({ method: 'PUT', path: `/1.1/classes/Counter/${record.objectId}`, body: { time: { __op: 'Increment', amount: 1 } } });
      const count = Number(record.time || 0) + Number(item.increment);
      document.getElementById(item.element).textContent = count.toLocaleString('zh-CN');
      document.getElementById(item.container).style.display = 'inline';
    }));
    if (increments.length) await request('POST', '/batch', { requests: increments });
  } catch {
    // Keep the footer usable when the independent statistics service is offline.
    console.warn('访问统计暂时无法连接，请稍后重试。');
  }
})();
