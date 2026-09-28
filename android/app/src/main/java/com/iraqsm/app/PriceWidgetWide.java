package com.iraqsm.app;

/** The 4×2 widget: three items, the dollar / 21K gold mithqal / ISX60 by default. */
public class PriceWidgetWide extends PriceWidget {
    @Override protected int layout() { return R.layout.widget_wide; }
    @Override protected boolean wide() { return true; }
    @Override protected String defaultConfig() {
        return "{\"theme\":\"navy\",\"items\":[{\"k\":\"fx\"},{\"k\":\"gold\",\"c\":\"21\"},{\"k\":\"isx\"}]}";
    }
}
