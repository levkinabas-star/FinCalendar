package com.budgettracker.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.budgettracker.app.widget.WidgetDataPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetDataPlugin.class);
        registerPlugin(FileSavePlugin.class);
        super.onCreate(savedInstanceState);

        // Cold start: check for a pending widget action.
        // React's getPendingAction() on mount handles it in ~100 ms (fast path).
        // If that fails, the 1500 ms fallback below reads SharedPrefs again and
        // dispatches the JS event directly — same mechanism as warm-start onNewIntent.
        SharedPreferences prefs = getSharedPreferences("BudgetWidgetData", MODE_PRIVATE);
        final String rawAction = prefs.getString("pendingWidgetAction", "");
        if (rawAction != null && !rawAction.isEmpty()) {
            final String safe = rawAction.replaceAll("[^a-zA-Z]", "");
            getBridge().getWebView().postDelayed(() -> {
                // Re-read: if React already consumed it via getPendingAction() the key is gone
                String current = prefs.getString("pendingWidgetAction", "");
                if (current != null && !current.isEmpty()) {
                    prefs.edit().remove("pendingWidgetAction").apply();
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('widgetAction',{detail:{action:'" + safe + "'}}));",
                        null);
                }
            }, 1500);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Warm start: app was already running (singleTask brings it to front)
        // Read pending action and dispatch directly to JS
        SharedPreferences prefs = getSharedPreferences("BudgetWidgetData", MODE_PRIVATE);
        String action = prefs.getString("pendingWidgetAction", null);
        if (action != null && !action.isEmpty()) {
            prefs.edit().remove("pendingWidgetAction").apply();
            // Sanitize to prevent any injection
            final String safe = action.replaceAll("[^a-zA-Z]", "");
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('widgetAction',{detail:{action:'" + safe + "'}}));",
                    null));
        }
    }
}
