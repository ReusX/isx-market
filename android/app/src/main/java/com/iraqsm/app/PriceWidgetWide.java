package com.iraqsm.app;

/** The 4×2 widget: the dollar, the 21K gold mithqal and ISX60 with its change. */
public class PriceWidgetWide extends PriceWidget {
    @Override protected int layout() { return R.layout.widget_wide; }
    @Override protected boolean wide() { return true; }
}
