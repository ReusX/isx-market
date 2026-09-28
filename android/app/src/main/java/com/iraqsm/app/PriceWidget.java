package com.iraqsm.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
import java.util.Locale;
import java.util.TimeZone;

/**
 * The 2×2 home-screen widget: the Kifah dollar rate.
 *
 * Reads the site's public feeds (iraqsm.com/data/*.json, the same numbers the
 * app shows), caches the last good reading so the widget never goes blank
 * offline, and redraws on the system's half-hourly tick and whenever the app
 * comes to the front (MainActivity.onResume). Tapping it opens the app.
 * PriceWidgetWide extends this with gold and ISX60.
 */
public class PriceWidget extends AppWidgetProvider {
    private static final String PREFS = "iq.widget";
    private static final String BASE = "https://iraqsm.com/data/";
    static final NumberFormat NF0 = NumberFormat.getIntegerInstance(Locale.US);
    static final NumberFormat NF2 = NumberFormat.getNumberInstance(Locale.US);
    static { NF2.setMinimumFractionDigits(2); NF2.setMaximumFractionDigits(2); }

    protected int layout() { return R.layout.widget_small; }
    protected boolean wide() { return false; }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        draw(ctx, mgr, ids);               // cached values first, instantly
        final PendingResult pending = goAsync();
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                fetch(app);
                draw(app, mgr, ids);
            } finally {
                pending.finish();
            }
        }).start();
    }

    /** Ask every placed widget of both sizes to refresh (called when the app opens). */
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

    private static String get(String path) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(BASE + path).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
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

    /** Fetch each feed on its own, so one failing leaves the others (and the cache) intact. */
    static void fetch(Context ctx) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        boolean any = false;
        try {
            JSONObject p = new JSONObject(get("fx.json")).getJSONObject("parallel");
            double sell = p.optDouble("sell", Double.NaN);
            if (Double.isNaN(sell)) sell = p.optDouble("buy", Double.NaN);
            if (!Double.isNaN(sell)) { e.putFloat("fx", (float) sell); any = true; }
        } catch (Exception ignored) { }
        try {
            JSONArray g = new JSONObject(get("gold.json")).getJSONArray("gramByCarat");
            for (int i = 0; i < g.length(); i++) {
                JSONObject k = g.getJSONObject(i);
                if (k.optInt("karat") == 21) { e.putFloat("gold", (float) k.optDouble("mithqalIqd")); any = true; }
            }
        } catch (Exception ignored) { }
        try {
            JSONArray s = new JSONObject(get("index.json")).getJSONArray("sessions");
            if (s.length() > 0) {
                double a = s.getJSONObject(0).getDouble("isx60");
                e.putFloat("isx", (float) a);
                if (s.length() > 1) {
                    double b = s.getJSONObject(1).getDouble("isx60");
                    e.putFloat("isxChg", (float) ((a - b) / b * 100));
                }
                any = true;
            }
        } catch (Exception ignored) { }
        if (any) e.putLong("at", System.currentTimeMillis());
        e.apply();
    }

    void draw(Context ctx, AppWidgetManager mgr, int[] ids) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        float fx = sp.getFloat("fx", -1), gold = sp.getFloat("gold", -1), isx = sp.getFloat("isx", -1);
        float chg = sp.getFloat("isxChg", Float.NaN);
        long at = sp.getLong("at", 0);

        RemoteViews v = new RemoteViews(ctx.getPackageName(), layout());
        v.setTextViewText(R.id.w_fx, fx > 0 ? NF0.format(Math.round(fx)) : "—");
        v.setTextViewText(R.id.w_fx_sub, fx > 0 ? ctx.getString(R.string.w_per_hundred, NF0.format(Math.round(fx * 100))) : "");
        if (wide()) {
            v.setTextViewText(R.id.w_gold, gold > 0 ? NF0.format(Math.round(gold)) : "—");
            v.setTextViewText(R.id.w_isx, isx > 0 ? NF2.format(isx) : "—");
            if (!Float.isNaN(chg)) {
                v.setTextViewText(R.id.w_isx_sub, "ISX60 · " + (chg > 0 ? "▲ " : chg < 0 ? "▼ " : "") + NF2.format(Math.abs(chg)) + "%");
                v.setTextColor(R.id.w_isx_sub, chg > 0 ? 0xFF6EE7A8 : chg < 0 ? 0xFFFF9C9C : 0xB3FFFFFF);
            }
        }
        if (at > 0) {
            SimpleDateFormat f = new SimpleDateFormat("h:mm a", new Locale("ar"));
            f.setTimeZone(TimeZone.getTimeZone("Asia/Baghdad"));
            v.setTextViewText(R.id.w_time, "IQWealth · " + ctx.getString(R.string.w_updated, toLatin(f.format(new Date(at)))));
        }

        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        mgr.updateAppWidget(ids, v);
    }

    /** The design uses Latin digits everywhere, the time included. */
    private static String toLatin(String s) {
        StringBuilder b = new StringBuilder(s.length());
        for (char ch : s.toCharArray()) b.append(ch >= '٠' && ch <= '٩' ? (char) ('0' + (ch - '٠')) : ch);
        return b.toString();
    }
}
