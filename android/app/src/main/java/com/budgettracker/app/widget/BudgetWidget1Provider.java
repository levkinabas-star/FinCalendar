package com.budgettracker.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.budgettracker.app.R;

public class BudgetWidget1Provider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_small);

            PendingIntent pi = makeActionIntent(context, id, "addExpense");
            views.setOnClickPendingIntent(R.id.widget_small_root, pi);
            views.setOnClickPendingIntent(R.id.widget_small_btn, pi);
            appWidgetManager.updateAppWidget(id, views);
        }
    }

    static PendingIntent makeActionIntent(Context ctx, int requestCode, String actionType) {
        Intent i = new Intent(ctx, WidgetActionReceiver.class);
        i.setAction(WidgetActionReceiver.ACTION);
        i.putExtra(WidgetActionReceiver.EXTRA_TYPE, actionType);
        return PendingIntent.getBroadcast(ctx, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
