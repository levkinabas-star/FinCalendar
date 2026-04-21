package com.budgettracker.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import com.budgettracker.app.R;

public class BudgetWidget2Provider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_medium);

            views.setOnClickPendingIntent(R.id.widget_btn_expense,
                    BudgetWidget1Provider.makeActionIntent(context, id * 10 + 1, "addExpense"));
            views.setOnClickPendingIntent(R.id.widget_btn_income,
                    BudgetWidget1Provider.makeActionIntent(context, id * 10 + 2, "addIncome"));
            views.setOnClickPendingIntent(R.id.widget_btn_calendar,
                    BudgetWidget1Provider.makeActionIntent(context, id * 10 + 3, "openCalendar"));

            appWidgetManager.updateAppWidget(id, views);
        }
    }
}
