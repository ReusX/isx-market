package com.iraqsm.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

/**
 * The home-screen widgets. PriceWidget is the 2×2 (one item), PriceWidgetWide
 * the 4×2 (three). What each widget shows and its colour theme are chosen in
 * the app (/app/widgets, through IQWidgetPlugin) and stored per widget id as
 * JSON in SharedPreferences:
 *
 *   {"theme":"navy","items":[{"k":"fx"},{"k":"cur","c":"EUR","l":"اليورو","m":1,"u":"…"},
 *                             {"k":"gold","c":"21"},{"k":"stock","c":"BBOB","l":"…"},{"k":"isx"}]}
 *
 * Prices come from the site's public feeds (iraqsm.com/data/*.json, the same
 * numbers the app shows), fetched only for the kinds some widget uses, cached
 * so a widget never goes blank offline, and refreshed on the half-hourly tick
 * and whenever the app opens. The settings icon opens /app/widgets; tapping a
 * price opens that item's screen.
 */
public class PriceWidget extends AppWidgetProvider {
    static final String PREFS = "iq.widget";
    private static final String BASE = "https://iraqsm.com/data/";
    static final NumberFormat NF0 = NumberFormat.getIntegerInstance(Locale.US);
    static final NumberFormat NF2 = NumberFormat.getNumberInstance(Locale.US);
    static { NF2.setMinimumFractionDigits(2); NF2.setMaximumFractionDigits(2); }

    protected int layout() { return R.layout.widget_small; }
    protected boolean wide() { return false; }
    protected String defaultConfig() { return "{\"theme\":\"navy\",\"items\":[{\"k\":\"fx\"}]}"; }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) draw(ctx, mgr, id);        // cached values first, instantly
        final PendingResult pending = goAsync();
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                fetch(app);
                for (int id : ids) draw(app, mgr, id);
            } finally {
                pending.finish();
            }
        }).start();
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        for (int id : ids) e.remove("cfg." + id);
        e.apply();
    }

    /** Ask every placed widget of both sizes to refresh (the app opening, a saved setting). */
    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (Class<?> c : new Class<?>[]{PriceWidget.class, PriceWidgetWide.class}) {
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, c));
            if (ids.length == 0) continue;
            Intent i = new Intent(ctx, c).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            ctx.sendBroadcast(i);
        }
    }

    /* ── Config ──────────────────────────────────────────────────────────── */

    JSONObject config(Context ctx, int id) {
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("cfg." + id, null);
        try { return new JSONObject(raw != null ? raw : defaultConfig()); } catch (Exception e) {
            try { return new JSONObject(defaultConfig()); } catch (Exception never) { return new JSONObject(); }
        }
    }

    /** Which feeds the placed widgets need. */
    static Set<String> needed(Context ctx) {
        Set<String> kinds = new HashSet<>();
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (Class<?> c : new Class<?>[]{PriceWidget.class, PriceWidgetWide.class}) {
            PriceWidget w = c == PriceWidget.class ? new PriceWidget() : new PriceWidgetWide();
            for (int id : mgr.getAppWidgetIds(new ComponentName(ctx, c))) {
                JSONArray items = w.config(ctx, id).optJSONArray("items");
                for (int i = 0; items != null && i < items.length(); i++) kinds.add(items.optJSONObject(i).optString("k"));
            }
        }
        if (kinds.isEmpty()) kinds.add("fx");
        return kinds;
    }

    /* ── Feeds ───────────────────────────────────────────────────────────── */

    private static String get(String path) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(BASE + path).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(10000);
        c.setRequestProperty("User-Agent", "IQWealthApp-Widget");
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            return sb.toString();
        } finally {
            c.disconnect();
        }
    }

    /** Each feed on its own: one failing keeps the others, and the cache, intact. */
    static void fetch(Context ctx) {
        Set<String> k = needed(ctx);
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        boolean any = false;
        String[][] feeds = {
            {"fx", "fx.json"}, {"fx", "fx-history.json"}, {"cur", "currencies.json"},
            {"gold", "gold.json"}, {"isx", "index.json"}, {"stock", "quotes.json"},
        };
        for (String[] f : feeds) {
            if (!k.contains(f[0])) continue;
            try { String body = get(f[1]); new JSONObject(body); e.putString("feed." + f[1], body); any = true; } catch (Exception ignored) { }
        }
        if (any) e.putLong("at", System.currentTimeMillis());
        e.apply();
    }

    static JSONObject feed(SharedPreferences sp, String name) {
        try { String s = sp.getString("feed." + name, null); return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; }
    }

    /* ── One item → label, value, sub-line, change tone, route ───────────── */

    static final class Cell { String label = "", value = "—", sub = ""; int tone = 0; String route = "/app"; }

    Cell cell(Context ctx, SharedPreferences sp, JSONObject it) {
        Cell c = new Cell();
        String k = it.optString("k", "fx"), code = it.optString("c", "");
        try {
            switch (k) {
                case "fx": {
                    c.label = ctx.getString(R.string.w_dollar_short);
                    c.route = "/app/fx";
                    JSONObject fx = feed(sp, "fx.json");
                    if (fx == null) break;
                    JSONObject p = fx.getJSONObject("parallel");
                    double sell = p.optDouble("sell", p.optDouble("buy", Double.NaN));
                    if (Double.isNaN(sell)) break;
                    c.value = NF0.format(Math.round(sell));
                    c.sub = ctx.getString(R.string.w_hundred, NF0.format(Math.round(sell * 100)));
                    JSONObject h = feed(sp, "fx-history.json");
                    if (h != null) {
                        String asOf = fx.optString("asOf", "");
                        JSONArray rows = h.getJSONObject("parallel").getJSONArray("rows");
                        double prev = Double.NaN;
                        for (int i = 0; i < rows.length(); i++) {
                            JSONObject r = rows.getJSONObject(i);
                            if (r.optString("date").compareTo(asOf) < 0) prev = r.optDouble("sell", r.optDouble("close", Double.NaN));
                        }
                        if (!Double.isNaN(prev)) {
                            double d = sell - prev;
                            String amt = Math.abs(d) >= 1 ? NF0.format(Math.round(Math.abs(d))) : NF2.format(Math.abs(d));
                            c.sub = ctx.getString(R.string.w_vs_yesterday, arrow(d) + amt);
                            c.tone = d > 0 ? -1 : d < 0 ? 1 : 0;   // a rising dollar is a falling dinar
                        }
                    }
                    break;
                }
                case "cur": {
                    c.label = it.optString("l", code);
                    c.route = "/app/currencies/" + code.toLowerCase(Locale.US);
                    c.sub = it.optString("u", "");
                    JSONObject cur = feed(sp, "currencies.json");
                    if (cur == null) break;
                    double usd = cur.optDouble("parallelUsd", Double.NaN);
                    double per = cur.getJSONObject("perUsd").optDouble(code, Double.NaN);
                    double v = usd / per * it.optDouble("m", 1);
                    if (!Double.isNaN(v) && !Double.isInfinite(v)) c.value = v >= 100 ? NF0.format(Math.round(v)) : NF2.format(v);
                    break;
                }
                case "gold": {
                    int karat = code.isEmpty() ? 21 : Integer.parseInt(code);
                    c.label = ctx.getString(R.string.w_gold);
                    c.sub = ctx.getString(R.string.w_mithqal_karat, karat);
                    c.route = "/app/gold";
                    JSONObject g = feed(sp, "gold.json");
                    if (g == null) break;
                    JSONArray ks = g.getJSONArray("gramByCarat");
                    for (int i = 0; i < ks.length(); i++) {
                        JSONObject o = ks.getJSONObject(i);
                        if (o.optInt("karat") == karat) c.value = NF0.format(Math.round(o.optDouble("mithqalIqd")));
                    }
                    break;
                }
                case "isx": {
                    c.label = ctx.getString(R.string.w_isx);
                    c.sub = "ISX60";
                    c.route = "/app/market";
                    JSONObject x = feed(sp, "index.json");
                    if (x == null) break;
                    JSONArray s = x.getJSONArray("sessions");
                    if (s.length() == 0) break;
                    double a = s.getJSONObject(0).getDouble("isx60");
                    c.value = NF2.format(a);
                    if (s.length() > 1) {
                        double b = s.getJSONObject(1).getDouble("isx60"), pct = (a - b) / b * 100;
                        c.sub = "ISX60 · " + arrow(pct) + NF2.format(Math.abs(pct)) + "%";
                        c.tone = pct > 0 ? 1 : pct < 0 ? -1 : 0;
                    }
                    break;
                }
                case "stock": {
                    c.label = it.optString("l", code);
                    c.route = "/c/" + code;
                    c.sub = code;
                    JSONObject q = feed(sp, "quotes.json");
                    if (q == null) break;
                    JSONArray cs = q.getJSONArray("companies");
                    for (int i = 0; i < cs.length(); i++) {
                        JSONObject o = cs.getJSONObject(i);
                        if (!code.equals(o.optString("ticker"))) continue;
                        double close = o.optDouble("close", Double.NaN);
                        if (!Double.isNaN(close)) c.value = close >= 100 ? NF0.format(close) : NF2.format(close);
                        if (o.optBoolean("traded") && !o.isNull("changePct")) {
                            double pct = o.optDouble("changePct");
                            c.sub = code + " · " + arrow(pct) + NF2.format(Math.abs(pct)) + "%";
                            c.tone = pct > 0 ? 1 : pct < 0 ? -1 : 0;
                        } else {
                            c.sub = code + " · " + ctx.getString(R.string.w_not_traded);
                        }
                    }
                    break;
                }
            }
        } catch (Exception ignored) { }
        return c;
    }

    static String arrow(double v) { return v > 0 ? "▲ " : v < 0 ? "▼ " : ""; }

    /* ── Themes ──────────────────────────────────────────────────────────── */

    static final class Theme {
        int bg, cell, ink, soft, faint, good, bad;
        Theme(int bg, int cell, int ink, int soft, int faint, int good, int bad) {
            this.bg = bg; this.cell = cell; this.ink = ink; this.soft = soft; this.faint = faint; this.good = good; this.bad = bad;
        }
    }

    static Theme theme(String name) {
        switch (name) {
            case "blue":  return new Theme(R.drawable.widget_bg_blue, R.drawable.widget_cell, 0xFFFFFFFF, 0xCCFFFFFF, 0x99FFFFFF, 0xFF9CF5C4, 0xFFFFC2C2);
            case "black": return new Theme(R.drawable.widget_bg_black, R.drawable.widget_cell, 0xFFFFFFFF, 0xB3FFFFFF, 0x80FFFFFF, 0xFF4ADE80, 0xFFFF7A7A);
            case "light": return new Theme(R.drawable.widget_bg_light, R.drawable.widget_cell_light, 0xFF1A2035, 0xFF5B6475, 0xFF8A92A3, 0xFF0A8F4E, 0xFFC62828);
            case "gold":  return new Theme(R.drawable.widget_bg_gold, R.drawable.widget_cell_gold, 0xFF2B1D02, 0xCC2B1D02, 0x992B1D02, 0xFF0A6B3B, 0xFFA11B1B);
            default:      return new Theme(R.drawable.widget_bg, R.drawable.widget_cell, 0xFFFFFFFF, 0xB3FFFFFF, 0x8CFFFFFF, 0xFF7CEBB0, 0xFFFFA3A3);
        }
    }

    /* ── Drawing ─────────────────────────────────────────────────────────── */

    PendingIntent open(Context ctx, int id, int slot, String route) {
        Intent i = new Intent(ctx, MainActivity.class)
            .setData(Uri.parse("iqwealth://widget/" + id + "/" + slot))
            .putExtra("route", route)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, id * 10 + slot, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    void draw(Context ctx, AppWidgetManager mgr, int id) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject cfg = config(ctx, id);
        Theme th = theme(cfg.optString("theme", "navy"));
        JSONArray items = cfg.optJSONArray("items");
        long at = sp.getLong("at", 0);
        String time = "";
        if (at > 0) {
            SimpleDateFormat f = new SimpleDateFormat("HH:mm", Locale.US);
            f.setTimeZone(TimeZone.getTimeZone("Asia/Baghdad"));
            time = ctx.getString(R.string.w_updated, f.format(new Date(at)));
        }

        RemoteViews v = new RemoteViews(ctx.getPackageName(), layout());
        v.setInt(R.id.w_root, "setBackgroundResource", th.bg);
        v.setInt(R.id.w_cfg, "setColorFilter", th.ink);
        v.setOnClickPendingIntent(R.id.w_cfg, open(ctx, id, 9, "/app/widgets"));
        v.setTextViewText(R.id.w_time, time.isEmpty() ? ctx.getString(R.string.w_loading) : time);
        v.setTextColor(R.id.w_time, th.faint);

        if (!wide()) {
            JSONObject it = items != null && items.length() > 0 ? items.optJSONObject(0) : null;
            Cell c = cell(ctx, sp, it != null ? it : new JSONObject());
            v.setTextViewText(R.id.w_title, c.label);
            v.setTextColor(R.id.w_title, th.ink);
            v.setTextViewText(R.id.w_value, c.value);
            v.setTextColor(R.id.w_value, th.ink);
            String unit = it != null && "fx".equals(it.optString("k")) ? ctx.getString(R.string.w_per_dollar)
                : it != null && "cur".equals(it.optString("k")) ? it.optString("u", "") : "";
            v.setTextViewText(R.id.w_unit, unit);
            v.setTextColor(R.id.w_unit, th.soft);
            v.setTextViewText(R.id.w_chg, c.sub.equals(unit) ? "" : c.sub);
            v.setTextColor(R.id.w_chg, c.tone > 0 ? th.good : c.tone < 0 ? th.bad : th.soft);
            v.setOnClickPendingIntent(R.id.w_root, open(ctx, id, 0, c.route));
        } else {
            v.setInt(R.id.w_star, "setColorFilter", th.ink);
            v.setTextColor(R.id.w_brand, th.ink);
            v.setOnClickPendingIntent(R.id.w_root, open(ctx, id, 0, "/app"));
            int[][] slots = {
                {R.id.w_c1, R.id.w_l1, R.id.w_v1, R.id.w_s1},
                {R.id.w_c2, R.id.w_l2, R.id.w_v2, R.id.w_s2},
                {R.id.w_c3, R.id.w_l3, R.id.w_v3, R.id.w_s3},
            };
            for (int s = 0; s < 3; s++) {
                JSONObject it = items != null && s < items.length() ? items.optJSONObject(s) : null;
                Cell c = cell(ctx, sp, it != null ? it : new JSONObject());
                v.setInt(slots[s][0], "setBackgroundResource", th.cell);
                v.setTextViewText(slots[s][1], c.label);
                v.setTextColor(slots[s][1], "gold".equals(it != null ? it.optString("k") : "") && !"light".equals(cfg.optString("theme")) && !"gold".equals(cfg.optString("theme")) ? 0xFFF0CD6E : th.ink);
                v.setTextViewText(slots[s][2], c.value);
                v.setTextColor(slots[s][2], th.ink);
                v.setTextViewText(slots[s][3], c.sub);
                v.setTextColor(slots[s][3], c.tone > 0 ? th.good : c.tone < 0 ? th.bad : th.soft);
                v.setOnClickPendingIntent(slots[s][0], open(ctx, id, s + 1, c.route));
            }
        }
        mgr.updateAppWidget(id, v);
    }
}
