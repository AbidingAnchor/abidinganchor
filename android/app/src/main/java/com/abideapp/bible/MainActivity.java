package com.abideapp.bible;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Allow content to draw behind status bar and navigation bar (edge-to-edge).
        // Do NOT call EdgeToEdge.enable() — it applies root-view inset padding that
        // pushes the Capacitor WebView down, causing a white gap on Android 15.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0a0a1a"));
        // Transparent window background prevents white flash before WebView paints.
        getWindow().setBackgroundDrawable(null);
        super.onCreate(savedInstanceState);
    }
}
