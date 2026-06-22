/* ════════════════════════════════════════════════════════════
   POLIMIX — Worker Cloudflare : compteur PARTAGÉ likes + lectures
   ------------------------------------------------------------
   - Stockage : Workers KV (gratuit). Une seule clé "stats" contient
     { likes:{...}, plays:{...} } indexés par identifiant de morceau.
   - Le binding KV doit s'appeler STATS (voir guide d'installation).
   - 100% gratuit dans les quotas Cloudflare free.
   ════════════════════════════════════════════════════════════ */
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const KEY = "stats";
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    const load = async () => {
      const raw = await env.STATS.get(KEY);
      return raw ? JSON.parse(raw) : { likes: {}, plays: {} };
    };

    // Lire tous les compteurs (au chargement de la page)
    if (url.pathname === "/stats" && request.method === "GET") {
      return json(await load());
    }

    // Incrémenter / décrémenter (un clic visiteur)
    if (request.method === "POST" &&
        ["/like", "/unlike", "/play"].includes(url.pathname)) {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const id = (body.id || "").toString().slice(0, 200);
      if (!id) return json({ error: "id manquant" }, 400);

      const data = await load();
      data.likes = data.likes || {}; data.plays = data.plays || {};
      if (url.pathname === "/like")   data.likes[id] = (data.likes[id] || 0) + 1;
      if (url.pathname === "/unlike") data.likes[id] = Math.max(0, (data.likes[id] || 0) - 1);
      if (url.pathname === "/play")   data.plays[id] = (data.plays[id] || 0) + 1;
      await env.STATS.put(KEY, JSON.stringify(data));
      return json({ ok: true, likes: data.likes[id] || 0, plays: data.plays[id] || 0 });
    }

    return new Response("Polimix stats API", { headers: cors });
  }
};
