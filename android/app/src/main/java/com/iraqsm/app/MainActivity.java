package com.iraqsm.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** The home-screen widgets catch up whenever the app is opened. */
    @Override
    public void onResume() {
        super.onResume();
        PriceWidget.refreshAll(this);
    }
}
