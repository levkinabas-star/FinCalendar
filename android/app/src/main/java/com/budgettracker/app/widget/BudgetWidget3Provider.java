package com.budgettracker.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import com.budgettracker.app.MainActivity;
import com.budgettracker.app.R;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class BudgetWidget3Provider extends AppWidgetProvider {

    static final String PREFS          = "BudgetWidgetData";
    static final String ACTION_PREV    = "com.budgettracker.app.widget.PREV_MONTH";
    static final String ACTION_NEXT    = "com.budgettracker.app.widget.NEXT_MONTH";
    static final String ACTION_REFRESH = "com.budgettracker.app.widget.REFRESH";

    // Russian month names
    private static final String[] MONTHS_RU = {
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    };

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) {
            updateWidget(ctx, mgr, id);
        }
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);

        String action = intent.getAction();
        if (ACTION_PREV.equals(action) || ACTION_NEXT.equals(action)) {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            int offset = prefs.getInt("calMonthOffset", 0);
            offset += ACTION_PREV.equals(action) ? -1 : 1;
            prefs.edit().putInt("calMonthOffset", offset).apply();

            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            ComponentName comp   = new ComponentName(ctx, BudgetWidget3Provider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_calendar_grid);
            for (int id : ids) updateWidget(ctx, mgr, id);
        } else if (ACTION_REFRESH.equals(action)) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            ComponentName comp   = new ComponentName(ctx, BudgetWidget3Provider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_calendar_grid);
            for (int id : ids) updateWidget(ctx, mgr, id);
        }
    }

    private void updateWidget(Context ctx, AppWidgetManager mgr, int widgetId) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int offset = prefs.getInt("calMonthOffset", 0);

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.DAY_OF_MONTH, 1);
        cal.add(Calendar.MONTH, offset);
        int month = cal.get(Calendar.MONTH);
        int year  = cal.get(Calendar.YEAR);
        String monthLabel = MONTHS_RU[month] + " " + year;

        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_calendar);
        views.setTextViewText(R.id.widget_cal_month, monthLabel);

        // Prev / Next month buttons + Refresh button
        views.setOnClickPendingIntent(R.id.widget_cal_prev,    makeBroadcast(ctx, ACTION_PREV,    widgetId));
        views.setOnClickPendingIntent(R.id.widget_cal_next,    makeBroadcast(ctx, ACTION_NEXT,    widgetId + 1000));
        views.setOnClickPendingIntent(R.id.widget_cal_refresh, makeBroadcast(ctx, ACTION_REFRESH, widgetId + 5000));

        // Grid adapter via RemoteViewsService
        Intent serviceIntent = new Intent(ctx, CalendarWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_calendar_grid, serviceIntent);

        // Template intent for day tap → open MainActivity
        Intent tapIntent = new Intent(ctx, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tapTemplate = PendingIntent.getActivity(ctx, widgetId + 2000, tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        views.setPendingIntentTemplate(R.id.widget_calendar_grid, tapTemplate);

        // Root tap → also open app
        views.setOnClickPendingIntent(R.id.widget_calendar_root,
                PendingIntent.getActivity(ctx, widgetId + 3000, tapIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        mgr.updateAppWidget(widgetId, views);
    }

    private PendingIntent makeBroadcast(Context ctx, String action, int requestCode) {
        Intent intent = new Intent(ctx, BudgetWidget3Provider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(ctx, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
