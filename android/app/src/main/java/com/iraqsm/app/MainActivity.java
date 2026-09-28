package com.iraqsm.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String ORIGIN = "https://iraqsm.com";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IQWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        openRoute(getIntent());
    }

    /** A widget tap carries the screen to open (always a path on iraqsm.com). */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openRoute(intent);
    }

    private void openRoute(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra("route");
        intent.removeExtra("route");
        if (route == null || !route.startsWith("/") || route.startsWith("//")) return;
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(ORIGIN + route));
    }

    /** The home-screen widgets catch up whenever the app is opened. */
    @Override
    public void onResume() {
        super.onResume();
        PriceWidget.refreshAll(this);
    }
}
