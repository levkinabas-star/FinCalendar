package com.budgettracker.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.budgettracker.app.R;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {

    @PluginMethod
    public void updateData(PluginCall call) {
        String balance        = call.getString("totalBalance",   "0");
        String currency       = call.getString("currency",       "₽");
        String txDates        = call.getString("txDates",        "");
        String pendingDates   = call.getString("pendingDates",   "");
        String completedDates = call.getString("completedDates", "");
        String debtDates      = call.getString("debtDates",      "");

        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(BudgetWidget3Provider.PREFS, Context.MODE_PRIVATE);

        // Check if calendar-relevant data actually changed before triggering a widget refresh
        boolean calendarChanged =
                !txDates.equals(prefs.getString("txDates", ""))
                || !pendingDates.equals(prefs.getString("pendingDates", ""))
                || !completedDates.equals(prefs.getString("completedDates", ""))
                || !debtDates.equals(prefs.getString("debtDates", ""));

        prefs.edit()
                .putString("totalBalance",   balance)
                .putString("currency",       currency)
                .putString("txDates",        txDates)
                .putString("pendingDates",   pendingDates)
                .putString("completedDates", completedDates)
                .putString("debtDates",      debtDates)
                .apply();

        // Only refresh the calendar GridView when date data changed.
        // notifyAppWidgetViewDataChanged triggers onDataSetChanged in the factory
        // without resetting the adapter — calling onUpdate here resets the adapter
        // via setRemoteAdapter and causes a loading-spinner flash on every cell.
        if (calendarChanged) {
            AppWidgetManager mgr  = AppWidgetManager.getInstance(ctx);
            ComponentName    comp = new ComponentName(ctx, BudgetWidget3Provider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            if (ids.length > 0) {
                mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_calendar_grid);
            }
        }

        call.resolve(new JSObject().put("updated", true));
    }

    @PluginMethod
    public void getPendingAction(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(BudgetWidget3Provider.PREFS, Context.MODE_PRIVATE);
        String action = prefs.getString("pendingWidgetAction", "");
        if (action != null && !action.isEmpty()) {
            prefs.edit().remove("pendingWidgetAction").apply();
        }
        call.resolve(new JSObject().put("action", action != null ? action : ""));
    }
}
