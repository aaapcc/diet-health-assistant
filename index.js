// 饮食健康助手 - 一个 Worker 搞定所有

// GitHub 上的文件地址（替换成你自己的）
const PUBLIC_URL = "https://raw.githubusercontent.com/aaapcc/diet-health-assistant/main/public.html";
const ADMIN_URL = "https://raw.githubusercontent.com/aaapcc/diet-health-assistant/main/admin.html";

const ADMIN_PASSWORD = "admin888";
const INITIAL_FOODS = [
  { id: "1", name: "鸡胸肉", categoryLevel1: "肉蛋水产类", categoryLevel2: "禽肉类", gi: 0, block: "green", protein: 23, isHighProtein: true }
];

async function initKV(env) {
  let foods = await env.DIET_DATA.get("foods", "json");
  if (!foods) await env.DIET_DATA.put("foods", JSON.stringify(INITIAL_FOODS));
}

async function fetchFromGitHub(url) {
  const res = await fetch(url);
  return await res.text();
}

export default {
  async fetch(request, env) {
    await initKV(env);
    const url = new URL(request.url);
    const path = url.pathname;

    // 公开展示页
    if (path === '/' || path === '/public') {
      const html = await fetchFromGitHub(PUBLIC_URL);
      return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }

    // 管理后台
    if (path === '/admin') {
      const html = await fetchFromGitHub(ADMIN_URL);
      return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }

    // API
    if (path === '/api/foods') {
      if (request.method === 'GET') {
        const foods = await env.DIET_DATA.get('foods', 'json') || [];
        return new Response(JSON.stringify(foods), { headers: { "Content-Type": "application/json" } });
      }
      if (request.method === 'POST') {
        const foods = await request.json();
        await env.DIET_DATA.put('foods', JSON.stringify(foods));
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};