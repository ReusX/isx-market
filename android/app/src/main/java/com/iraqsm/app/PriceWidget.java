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
            JSONObject fx = new JSONObject(get("fx.json"));
            JSONObject p = fx.getJSONObject("parallel");
            double sell = p.optDouble("sell", Double.NaN);
            if (Double.isNaN(sell)) sell = p.optDouble("buy", Double.NaN);
            if (!Double.isNaN(sell)) {
                e.putFloat("fx", (float) sell);
                any = true;
                /* The change is against the last recorded close before today's date. */
                try {
                    String asOf = fx.optString("asOf", "");
                    JSONArray rows = new JSONObject(get("fx-history.json")).getJSONObject("parallel").getJSONArray("rows");
                    double prev = Double.NaN;
                    for (int i = 0; i < rows.length(); i++) {
                        JSONObject r = rows.getJSONObject(i);
                        if (r.optString("date").compareTo(asOf) < 0) prev = r.optDouble("sell", r.optDouble("close", Double.NaN));
                    }
                    if (!Double.isNaN(prev)) e.putFloat("fxChg", (float) (sell - prev)); else e.remove("fxChg");
                } catch (Exception ignored) { }
            }
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

    static final int GOOD = 0xFF7CEBB0, BAD = 0xFFFFA3A3, DIM = 0xCCFFFFFF;

    static String arrow(float v) { return v > 0 ? "▲ " : v < 0 ? "▼ " : ""; }

    void draw(Context ctx, AppWidgetManager mgr, int[] ids) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        float fx = sp.getFloat("fx", -1), gold = sp.getFloat("gold", -1), isx = sp.getFloat("isx", -1);
        float fxChg = sp.getFloat("fxChg", Float.NaN), isxChg = sp.getFloat("isxChg", Float.NaN);
        long at = sp.getLong("at", 0);
        String time = "";
        if (at > 0) {
            SimpleDateFormat f = new SimpleDateFormat("HH:mm", Locale.US);
            f.setTimeZone(TimeZone.getTimeZone("Asia/Baghdad"));
            time = f.format(new Date(at));
        }

        RemoteViews v = new RemoteViews(ctx.getPackageName(), layout());
        v.setTextViewText(R.id.w_fx, fx > 0 ? NF0.format(Math.round(fx)) : "—");
        /* A rising dollar is a falling dinar: coloured the way the app colours it. */
        if (!Float.isNaN(fxChg) && fx > 0) {
            String amt = Math.abs(fxChg) >= 1 ? NF0.format(Math.round(Math.abs(fxChg))) : NF2.format(Math.abs(fxChg));
            v.setTextViewText(R.id.w_fx_chg, ctx.getString(R.string.w_vs_yesterday, arrow(fxChg) + amt));
            v.setTextColor(R.id.w_fx_chg, fxChg > 0 ? BAD : fxChg < 0 ? GOOD : DIM);
        } else {
            v.setTextViewText(R.id.w_fx_chg, fx > 0 ? ctx.getString(R.string.w_hundred, NF0.format(Math.round(fx * 100))) : "");
        }

        if (wide()) {
            v.setTextViewText(R.id.w_gold, gold > 0 ? NF0.format(Math.round(gold)) : "—");
            v.setTextViewText(R.id.w_isx, isx > 0 ? NF2.format(isx) : "—");
            if (!Float.isNaN(isxChg)) {
                v.setTextViewText(R.id.w_isx_sub, "ISX60 · " + arrow(isxChg) + NF2.format(Math.abs(isxChg)) + "%");
                v.setTextColor(R.id.w_isx_sub, isxChg > 0 ? GOOD : isxChg < 0 ? BAD : DIM);
            }
            v.setTextViewText(R.id.w_time, time.isEmpty() ? ctx.getString(R.string.w_loading) : ctx.getString(R.string.w_updated, time));
        } else {
            String hundred = fx > 0 ? ctx.getString(R.string.w_hundred, NF0.format(Math.round(fx * 100))) : "";
            v.setTextViewText(R.id.w_fx_sub, time.isEmpty() ? hundred : hundred + "  ·  " + time);
        }

        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        mgr.updateAppWidget(ids, v);
    }

}
