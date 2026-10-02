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
        if (kinds.isEmpty() || kinds.contains("cur")) kinds.add("fx");
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

    /* ── One item → label, value, unit, the day's percent change, route ─── */

    static final int DINAR = 0, OCHRE = 1, LAPIS = 2;
    static final class Cell { String label = "", value = "—", unit = ""; double pct = Double.NaN; int world = DINAR; String route = "/app"; }

    /** The dollar's day move on the website's one rule (lib/fxHistory fxDayMove): mid-price vs the previous close. */
    static double fxPct(SharedPreferences sp) {
        try {
            JSONObject fx = feed(sp, "fx.json"), h = feed(sp, "fx-history.json");
            if (fx == null || h == null) return Double.NaN;
            JSONObject p = fx.getJSONObject("parallel");
            double buy = p.optDouble("buy", Double.NaN), sell = p.optDouble("sell", Double.NaN);
            double now = !Double.isNaN(buy) && !Double.isNaN(sell) ? (buy + sell) / 2 : !Double.isNaN(sell) ? sell : buy;
            String asOf = fx.optString("asOf", "");
            JSONArray rows = h.getJSONObject("parallel").getJSONArray("rows");
            double prev = Double.NaN;
            for (int i = 0; i < rows.length(); i++) {
                JSONObject r = rows.getJSONObject(i);
                if (r.optString("date").compareTo(asOf) < 0 && !r.isNull("close")) prev = r.optDouble("close", Double.NaN);
            }
            return Double.isNaN(now) || Double.isNaN(prev) || prev == 0 ? Double.NaN : (now - prev) / prev * 100;
        } catch (Exception e) { return Double.NaN; }
    }

    Cell cell(Context ctx, SharedPreferences sp, JSONObject it) {
        Cell c = new Cell();
        String k = it.optString("k", "fx"), code = it.optString("c", "");
        try {
            switch (k) {
                case "fx": {
                    c.label = ctx.getString(R.string.w_dollar_short);
                    c.unit = ctx.getString(R.string.w_per_dollar);
                    c.route = "/app/fx";
                    JSONObject fx = feed(sp, "fx.json");
                    if (fx == null) break;
                    JSONObject p = fx.getJSONObject("parallel");
                    double sell = p.optDouble("sell", p.optDouble("buy", Double.NaN));
                    if (Double.isNaN(sell)) break;
                    c.value = NF0.format(Math.round(sell));
                    c.pct = fxPct(sp);
                    break;
                }
                case "cur": {
                    c.label = it.optString("l", code);
                    c.route = "/app/currencies/" + code.toLowerCase(Locale.US);
                    c.unit = it.optString("u", "");
                    JSONObject cur = feed(sp, "currencies.json");
                    if (cur == null) break;
                    double usd = cur.optDouble("parallelUsd", Double.NaN);
                    double per = cur.getJSONObject("perUsd").optDouble(code, Double.NaN);
                    double v = usd / per * it.optDouble("m", 1);
                    if (!Double.isNaN(v) && !Double.isInfinite(v)) c.value = v >= 100 ? NF0.format(Math.round(v)) : NF2.format(v);
                    c.pct = fxPct(sp);   // priced through the dollar, so it moves with it
                    break;
                }
                case "gold": {
                    int karat = code.isEmpty() ? 21 : Integer.parseInt(code);
                    c.world = OCHRE;
                    c.label = ctx.getString(R.string.w_gold);
                    c.unit = ctx.getString(R.string.w_mithqal_karat, karat);
                    c.route = "/app/gold";
                    JSONObject g = feed(sp, "gold.json");
                    if (g == null) break;
                    double now = mithqal(g.optJSONArray("gramByCarat"), karat);
                    if (!Double.isNaN(now)) c.value = NF0.format(Math.round(now));
                    JSONObject prev = g.optJSONObject("previous");
                    double was = prev == null ? Double.NaN : mithqal(prev.optJSONArray("gramByCarat"), karat);
                    if (!Double.isNaN(now) && !Double.isNaN(was) && was > 0) c.pct = (now - was) / was * 100;
                    break;
                }
                case "isx": {
                    c.world = LAPIS;
                    c.label = ctx.getString(R.string.w_isx);
                    c.unit = "ISX60";
                    c.route = "/app/market";
                    JSONObject x = feed(sp, "index.json");
                    if (x == null) break;
                    JSONArray s = x.getJSONArray("sessions");
                    if (s.length() == 0) break;
                    double a = s.getJSONObject(0).getDouble("isx60");
                    c.value = NF2.format(a);
                    if (s.length() > 1) { double b = s.getJSONObject(1).getDouble("isx60"); c.pct = (a - b) / b * 100; }
                    break;
                }
                case "stock": {
                    c.world = LAPIS;
                    c.label = it.optString("l", code);
                    c.route = "/c/" + code;
                    c.unit = code;
                    JSONObject q = feed(sp, "quotes.json");
                    if (q == null) break;
                    JSONArray cs = q.getJSONArray("companies");
                    for (int i = 0; i < cs.length(); i++) {
                        JSONObject o = cs.getJSONObject(i);
                        if (!code.equals(o.optString("ticker"))) continue;
                        double close = o.optDouble("close", Double.NaN);
                        if (!Double.isNaN(close)) c.value = close >= 100 ? NF0.format(close) : NF2.format(close);
                        if (o.optBoolean("traded") && !o.isNull("changePct")) c.pct = o.optDouble("changePct");
                        else c.unit = code + " · " + ctx.getString(R.string.w_not_traded);
                    }
                    break;
                }
            }
        } catch (Exception ignored) { }
        return c;
    }

    static double mithqal(JSONArray ks, int karat) {
        for (int i = 0; ks != null && i < ks.length(); i++) {
            JSONObject o = ks.optJSONObject(i);
            if (o != null && o.optInt("karat") == karat) return o.optDouble("mithqalIqd", Double.NaN);
        }
        return Double.NaN;
    }

    /** The board's chip: percent only, signed, a real minus. */
    static String pct(double v) {
        String sign = Math.abs(v) < 0.005 ? "" : v > 0 ? "+" : "−";
        return sign + NF2.format(Math.abs(v)) + "%";
    }

    /* ── Themes (identity v3) ────────────────────────────────────────────────
       The frame is neutral; the section's world ink marks only the square tag
       and the swoosh. Up is green and down is red for every price. Colours
       are app/globals.css: dark page, newsprint, and the lapis/ochre fills. */

    static final class Theme {
        int bg, cell, chip, ink, soft, faint, up, down, flat;
        int[] worlds;   // dinar, ochre, lapis
        Theme(int bg, int cell, int chip, int ink, int soft, int faint, int up, int down, int[] worlds) {
            this.bg = bg; this.cell = cell; this.chip = chip; this.ink = ink; this.soft = soft; this.faint = faint;
            this.up = up; this.down = down; this.flat = soft; this.worlds = worlds;
        }
    }

    static final int[] WORLDS_DARK = {0xFF3F9A66, 0xFFD4A43C, 0xFF4A6CC4};
    static final int[] WORLDS_LIGHT = {0xFF2F7D4F, 0xFFA87A14, 0xFF2F4F9E};

    static Theme theme(String name) {
        switch (name) {
            case "black": return new Theme(R.drawable.widget_bg_black, R.drawable.widget_cell, R.drawable.widget_chip,
                0xFFE9E7E3, 0xFFB9BEC6, 0xFF9BA1AB, 0xFF5CC488, 0xFFE2775C, WORLDS_DARK);
            case "light": return new Theme(R.drawable.widget_bg_light, R.drawable.widget_cell_light, R.drawable.widget_chip_light,
                0xFF1C1A17, 0xFF4F483E, 0xFF6F6556, 0xFF2A6F46, 0xFFB23E26, WORLDS_LIGHT);
            case "blue":  return new Theme(R.drawable.widget_bg_blue, R.drawable.widget_cell_blue, R.drawable.widget_chip,
                0xFFFFFFFF, 0xD9FFFFFF, 0xB3FFFFFF, 0xFFA8EBC2, 0xFFFFB9A6, new int[]{0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF});
            case "gold":  return new Theme(R.drawable.widget_bg_gold, R.drawable.widget_cell_gold, R.drawable.widget_chip_light,
                0xFF1C1A17, 0xD91C1A17, 0xB31C1A17, 0xFF1D5A37, 0xFF8A2A17, new int[]{0xFF1C1A17, 0xFF1C1A17, 0xFF1C1A17});
            default:      return new Theme(R.drawable.widget_bg, R.drawable.widget_cell, R.drawable.widget_chip,
                0xFFE9E7E3, 0xFFB9BEC6, 0xFF9BA1AB, 0xFF5CC488, 0xFFE2775C, WORLDS_DARK);
        }
    }

    int tone(Theme th, double v) { return Double.isNaN(v) || Math.abs(v) < 0.005 ? th.flat : v > 0 ? th.up : th.down; }

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
            v.setInt(R.id.w_tag, "setColorFilter", th.worlds[c.world]);
            v.setInt(R.id.w_swoosh, "setColorFilter", th.worlds[c.world]);
            v.setTextViewText(R.id.w_title, c.label);
            v.setTextColor(R.id.w_title, th.ink);
            v.setTextViewText(R.id.w_value, c.value);
            v.setTextColor(R.id.w_value, th.ink);
            v.setTextViewText(R.id.w_unit, c.unit);
            v.setTextColor(R.id.w_unit, th.faint);
            boolean has = !Double.isNaN(c.pct);
            v.setViewVisibility(R.id.w_chg, has ? android.view.View.VISIBLE : android.view.View.GONE);
            v.setTextViewText(R.id.w_chg, has ? pct(c.pct) : "");
            v.setTextColor(R.id.w_chg, tone(th, c.pct));
            v.setInt(R.id.w_chg, "setBackgroundResource", th.chip);
            v.setOnClickPendingIntent(R.id.w_root, open(ctx, id, 0, c.route));
        } else {
            v.setInt(R.id.w_star, "setColorFilter", th.ink);
            v.setTextColor(R.id.w_brand, th.ink);
            v.setOnClickPendingIntent(R.id.w_root, open(ctx, id, 0, "/app"));
            int[][] slots = {
                {R.id.w_c1, R.id.w_l1, R.id.w_v1, R.id.w_s1, R.id.w_t1},
                {R.id.w_c2, R.id.w_l2, R.id.w_v2, R.id.w_s2, R.id.w_t2},
                {R.id.w_c3, R.id.w_l3, R.id.w_v3, R.id.w_s3, R.id.w_t3},
            };
            for (int s = 0; s < 3; s++) {
                JSONObject it = items != null && s < items.length() ? items.optJSONObject(s) : null;
                Cell c = cell(ctx, sp, it != null ? it : new JSONObject());
                v.setInt(slots[s][0], "setBackgroundResource", th.cell);
                v.setInt(slots[s][4], "setColorFilter", th.worlds[c.world]);
                v.setTextViewText(slots[s][1], c.label);
                v.setTextColor(slots[s][1], th.soft);
                v.setTextViewText(slots[s][2], c.value);
                v.setTextColor(slots[s][2], th.ink);
                boolean has = !Double.isNaN(c.pct);
                v.setTextViewText(slots[s][3], has ? pct(c.pct) : c.unit);
                v.setTextColor(slots[s][3], has ? tone(th, c.pct) : th.faint);
                v.setOnClickPendingIntent(slots[s][0], open(ctx, id, s + 1, c.route));
            }
        }
        mgr.updateAppWidget(id, v);
    }
}
