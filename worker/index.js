// 饮食健康助手 - Worker API

const INITIAL_FOODS = [
  { id: "1", name: "鸡胸肉", alias: "", categoryLevel1: "肉蛋水产类", categoryLevel2: "禽肉类", effect: "高蛋白低脂肪", gi: 0, block: "green", protein: 23, isHighProtein: true },
  { id: "2", name: "三文鱼", alias: "鲑鱼", categoryLevel1: "肉蛋水产类", categoryLevel2: "鱼类", effect: "富含Omega-3", gi: 0, block: "green", protein: 20, isHighProtein: true },
  { id: "3", name: "黄瓜", alias: "青瓜", categoryLevel1: "蔬菜类", categoryLevel2: "瓜茄类", effect: "富含维生素", gi: 15, block: "green", protein: 0.7, isHighProtein: false }
];

async function initKV(env) {
  let foods = await env.DIET_DATA.get("foods", "json");
  if (!foods) {
    await env.DIET_DATA.put("foods", JSON.stringify(INITIAL_FOODS));
  }
}

export default {
  async fetch(request, env) {
    await initKV(env);
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 处理 CORS
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    
    // API: 获取食品列表
    if (path === "/api/foods" && request.method === "GET") {
      const foods = await env.DIET_DATA.get("foods", "json") || [];
      return new Response(JSON.stringify(foods), { headers });
    }
    
    // API: 保存食品列表
    if (path === "/api/foods" && request.method === "POST") {
      const foods = await request.json();
      await env.DIET_DATA.put("foods", JSON.stringify(foods));
      return new Response(JSON.stringify({ success: true }), { headers });
    }
    
    return new Response("Not Found", { status: 404 });
  }
};