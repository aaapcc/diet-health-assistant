// ==================== 饮食健康助手 Worker API ====================
// 包含登录验证、缓存清除功能

const ADMIN_PASSWORD = "admin888";
const CLOUDFLARE_ZONE_ID = "d6bb729e2b588ddff3e5624354c1a87d";
const CLOUDFLARE_API_TOKEN = "cfut_QCMbaGqNnonSdOGtWSspA1W3xWEMUQdrinGsDTiK6413a88e";  // 需要您自己生成

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
    const password = parts[1];
    return password === ADMIN_PASSWORD;
  } catch(e) {
    return false;
  }
}

// 清除 Cloudflare 缓存
async function purgeCloudflareCache() {
  const url = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // 清除前端页面和 API 缓存
      files: [
        "https://jiankang.aaqq.site/",
        "https://jiankang.aaqq.site/index.html",
        "https://jiankang.aaqq.site/admin.html",
        "https://jiankang.aaqq.site/api/foods"
      ]
    })
  });
  return await response.json();
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
          const token = btoa(`admin:${ADMIN_PASSWORD}:${Date.now()}`);
          return new Response(JSON.stringify({ success: true, token: token }), { headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ success: false, message: "密码错误" }), { 
            status: 401, headers: corsHeaders 
          });
        }
      } catch(e) {
        return new Response(JSON.stringify({ success: false, message: "请求格式错误" }), { 
          status: 400, headers: corsHeaders 
        });
      }
    }

    // ==================== 刷新前端缓存 API ====================
    if (path === "/api/purge-cache" && request.method === "POST") {
      if (!verifyToken(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: corsHeaders
        });
      }
      
      try {
        const result = await purgeCloudflareCache();
        if (result.success) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: "缓存已清除，公开展示页将显示最新数据" 
          }), { headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "清除失败: " + JSON.stringify(result.errors) 
          }), { status: 500, headers: corsHeaders });
        }
      } catch(e) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "清除失败: " + e.message 
        }), { status: 500, headers: corsHeaders });
      }
    }

    // ==================== 食品 API ====================
    if (path === "/api/foods" && request.method === "GET") {
      const foods = await env.DIET_DATA.get("foods", "json") || [];
      return new Response(JSON.stringify(foods), { headers: corsHeaders });
    }

    if (path === "/api/foods" && request.method === "POST") {
      if (!verifyToken(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: corsHeaders
        });
      }
      const foods = await request.json();
      await env.DIET_DATA.put("foods", JSON.stringify(foods));
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ==================== 分类 API ====================
    if (path === "/api/categories" && request.method === "GET") {
      const categories = await env.DIET_DATA.get("categories", "json") || { level1: [] };
      return new Response(JSON.stringify(categories), { headers: corsHeaders });
    }

    if (path === "/api/categories" && request.method === "POST") {
      if (!verifyToken(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: corsHeaders
        });
      }
      const categories = await request.json();
      await env.DIET_DATA.put("categories", JSON.stringify(categories));
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { 
      status: 404, headers: corsHeaders 
    });
  }
};