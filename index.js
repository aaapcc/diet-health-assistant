// 饮食健康助手 - Worker API（极简版）
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    };

    // GET 食品列表
    if (path === "/api/foods" && request.method === "GET") {
      const foods = await env.DIET_DATA.get("foods", "json") || [];
      return new Response(JSON.stringify(foods), { headers });
    }

    // POST 保存食品列表
    if (path === "/api/foods" && request.method === "POST") {
      const foods = await request.json();
      await env.DIET_DATA.put("foods", JSON.stringify(foods));
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // GET 分类列表
    if (path === "/api/categories" && request.method === "GET") {
      const categories = await env.DIET_DATA.get("categories", "json") || { level1: [] };
      return new Response(JSON.stringify(categories), { headers });
    }

    // POST 保存分类列表
    if (path === "/api/categories" && request.method === "POST") {
      const categories = await request.json();
      await env.DIET_DATA.put("categories", JSON.stringify(categories));
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response("Not Found", { status: 404 });
  }
};