package com.iraqsm.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The bridge between the app's /app/widgets screen and the home-screen widgets:
 * list() the placed widgets with their settings, save() one widget's settings
 * (JSON, see PriceWidget) and redraw. Nothing leaves the phone.
 */
@CapacitorPlugin(name = "IQWidget")
public class IQWidgetPlugin extends Plugin {

    @PluginMethod
    public void list(PluginCall call) {
        Context ctx = getContext();
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        JSArray out = new JSArray();
        Object[][] kinds = {{PriceWidget.class, "small"}, {PriceWidgetWide.class, "wide"}};
        for (Object[] k : kinds) {
            Class<?> c = (Class<?>) k[0];
            PriceWidget w = c == PriceWidget.class ? new PriceWidget() : new PriceWidgetWide();
            for (int id : mgr.getAppWidgetIds(new ComponentName(ctx, c))) {
                JSObject o = new JSObject();
                o.put("id", id);
                o.put("size", k[1]);
                o.put("config", w.config(ctx, id).toString());
                out.put(o);
            }
        }
        JSObject res = new JSObject();
        res.put("widgets", out);
        call.resolve(res);
    }

    @PluginMethod
    public void save(PluginCall call) {
        Integer id = call.getInt("id");
        String cfg = call.getString("config");
        if (id == null || cfg == null) { call.reject("id and config are required"); return; }
        try { new org.json.JSONObject(cfg); } catch (Exception e) { call.reject("config is not JSON"); return; }
        getContext().getSharedPreferences(PriceWidget.PREFS, Context.MODE_PRIVATE).edit().putString("cfg." + id, cfg).apply();
        PriceWidget.refreshAll(getContext());
        call.resolve();
    }
}
