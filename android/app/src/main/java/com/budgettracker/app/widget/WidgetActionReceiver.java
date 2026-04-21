package com.budgettracker.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.budgettracker.app.MainActivity;

public class WidgetActionReceiver extends BroadcastReceiver {

    static final String ACTION     = "com.budgettracker.app.WIDGET_ACTION";
    static final String EXTRA_TYPE = "actionType";

    @Override
    public void onReceive(Context context, Intent intent) {
        String type = intent.getStringExtra(EXTRA_TYPE);
        if (type != null && !type.isEmpty()) {
            context.getSharedPreferences(BudgetWidget3Provider.PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString("pendingWidgetAction", type)
                    .apply();
        }

        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
    }
}
