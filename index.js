// ==================== 饮食健康助手 Worker API ====================
// 包含登录验证、CORS 支持、数据存储

const ADMIN_PASSWORD = "admin888";

// 初始数据
const INITIAL_FOODS = [
  { id: "1", name: "鸡胸肉", alias: "", categoryLevel1: "肉蛋水产类", categoryLevel2: "禽肉类", effect: "高蛋白低脂肪", gi: 0, block: "green", protein: 23, isHighProtein: true },
  { id: "2", name: "三文鱼", alias: "鲑鱼", categoryLevel1: "肉蛋水产类", categoryLevel2: "鱼类", effect: "富含Omega-3", gi: 0, block: "green", protein: 20, isHighProtein: true },
  { id: "3", name: "黄瓜", alias: "青瓜", categoryLevel1: "蔬菜类", categoryLevel2: "瓜茄类", effect: "富含维生素", gi: 15, block: "green", protein: 0.7, isHighProtein: false }
];

const INITIAL_CATEGORIES = {
  level1: [
    { id: "cat1", name: "肉蛋水产类", order: 1, subcategories: [
      { id: "sub1", name: "禽肉类", order: 1 },
      { id: "sub2", name: "鱼类", order: 2 }
    ]},
    { id: "cat2", name: "蔬菜类", order: 2, subcategories: [
      { id: "sub3", name: "瓜茄类", order: 1 }
    ]}
  ]
};

// 初始化 KV 数据
async function initKV(env) {
  let foods = await env.DIET_DATA.get("foods", "json");
  if (!foods || foods.length === 0) {
    await env.DIET_DATA.put("foods", JSON.stringify(INITIAL_FOODS));
  }
  let categories = await env.DIET_DATA.get("categories", "json");
  if (!categories || !categories.level1 || categories.level1.length === 0) {
    await env.DIET_DATA.put("categories", JSON.stringify(INITIAL_CATEGORIES));
  }
}

// 验证 Token
function verifyToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth) return false;
  try {
    const token = auth.split(" ")[1];
    const decoded = atob(token);
    const parts = decoded.split(":");
    // 格式: admin:password:timestamp
    const password = parts[1];
    return password === ADMIN_PASSWORD;
  } catch(e) {
    return false;
  }
}

// 处理 CORS 预检
function handleOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    }
  });
}

// 通用响应头
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

export default {
  async fetch(request, env) {
    await initKV(env);
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 OPTIONS 预检
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // ==================== 登录 API ====================
    if (path === "/api/login" && request.method === "POST") {
      try {
        const { password } = await request.json();
        if (password === ADMIN_PASSWORD) {
          // 生成 token（base64 编码）
          const token = btoa(`admin:${ADMIN_PASSWORD}:${Date.now()}`);
          return new Response(JSON.stringify({ 
            success: true, 
            token: token 
          }), { headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "密码错误" 
          }), { 
            status: 401,
            headers: corsHeaders 
          });
        }
      } catch(e) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "请求格式错误" 
        }), { 
          status: 400,
          headers: corsHeaders 
        });
      }
    }

    // ==================== 食品 API ====================
    // GET /api/foods - 获取食品列表（无需认证）
    if (path === "/api/foods" && request.method === "GET") {
      const foods = await env.DIET_DATA.get("foods", "json") || [];
      return new Response(JSON.stringify(foods), { headers: corsHeaders });
    }

    // POST /api/foods - 保存食品列表（需要认证）
    if (path === "/api/foods" && request.method === "POST") {
      if (!verifyToken(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders
        });
      }
      const foods = await request.json();
      await env.DIET_DATA.put("foods", JSON.stringify(foods));
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ==================== 分类 API ====================
    // GET /api/categories - 获取分类列表（无需认证）
    if (path === "/api/categories" && request.method === "GET") {
      const categories = await env.DIET_DATA.get("categories", "json") || { level1: [] };
      return new Response(JSON.stringify(categories), { headers: corsHeaders });
    }

    // POST /api/categories - 保存分类列表（需要认证）
    if (path === "/api/categories" && request.method === "POST") {
      if (!verifyToken(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders
        });
      }
      const categories = await request.json();
      await env.DIET_DATA.put("categories", JSON.stringify(categories));
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { 
      status: 404,
      headers: corsHeaders 
    });
  }
};