package com.budgettracker.app.widget;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.budgettracker.app.R;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class CalendarWidgetFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final List<DayItem> days = new ArrayList<>();

    CalendarWidgetFactory(Context context) {
        this.context = context;
    }

    @Override public void onCreate()         { buildCalendar(); }
    @Override public void onDataSetChanged() { buildCalendar(); }
    @Override public void onDestroy()        {}

    private Set<String> loadDateSet(SharedPreferences prefs, String key) {
        String raw = prefs.getString(key, "");
        Set<String> set = new HashSet<>();
        if (raw != null && !raw.isEmpty()) {
            set.addAll(Arrays.asList(raw.split(",")));
        }
        return set;
    }

    private void buildCalendar() {
        days.clear();

        SharedPreferences prefs = context.getSharedPreferences(
                BudgetWidget3Provider.PREFS, Context.MODE_PRIVATE);
        int offset = prefs.getInt("calMonthOffset", 0);

        Set<String> txDates        = loadDateSet(prefs, "txDates");
        Set<String> pendingDates   = loadDateSet(prefs, "pendingDates");
        Set<String> completedDates = loadDateSet(prefs, "completedDates");
        Set<String> debtDates      = loadDateSet(prefs, "debtDates");

        Calendar today = Calendar.getInstance();
        int todayY = today.get(Calendar.YEAR);
        int todayM = today.get(Calendar.MONTH);
        int todayD = today.get(Calendar.DAY_OF_MONTH);

        Calendar base = Calendar.getInstance();
        base.set(Calendar.DAY_OF_MONTH, 1);
        base.add(Calendar.MONTH, offset);
        int year  = base.get(Calendar.YEAR);
        int month = base.get(Calendar.MONTH);

        // First cell = Monday of the week containing day 1
        Calendar cur = (Calendar) base.clone();
        int dow  = cur.get(Calendar.DAY_OF_WEEK);
        int back = (dow == Calendar.SUNDAY) ? 6 : dow - Calendar.MONDAY;
        cur.add(Calendar.DAY_OF_MONTH, -back);

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

        for (int i = 0; i < 42; i++) {
            boolean inMonth = cur.get(Calendar.YEAR) == year && cur.get(Calendar.MONTH) == month;
            boolean isToday = cur.get(Calendar.YEAR) == todayY
                    && cur.get(Calendar.MONTH) == todayM
                    && cur.get(Calendar.DAY_OF_MONTH) == todayD;
            int curDow  = cur.get(Calendar.DAY_OF_WEEK);
            boolean wknd = curDow == Calendar.SATURDAY || curDow == Calendar.SUNDAY;
            String dateStr = sdf.format(cur.getTime());

            boolean hasTx        = inMonth && txDates.contains(dateStr);
            boolean hasPending   = inMonth && pendingDates.contains(dateStr);
            boolean hasCompleted = inMonth && completedDates.contains(dateStr);
            boolean hasDebt      = inMonth && debtDates.contains(dateStr);

            days.add(new DayItem(cur.get(Calendar.DAY_OF_MONTH), inMonth, isToday, wknd,
                    hasTx, hasPending, hasCompleted, hasDebt, dateStr));
            cur.add(Calendar.DAY_OF_MONTH, 1);
        }
    }

    @Override
    public int getCount() { return days.size(); }

    @Override
    public RemoteViews getViewAt(int position) {
        DayItem d  = days.get(position);
        RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_item);

        if (!d.inMonth) {
            rv.setTextViewText(R.id.calendar_day_num, "");
            rv.setInt(R.id.calendar_day_num, "setBackgroundColor", 0x00000000);
            rv.setViewVisibility(R.id.dot_pending,       View.GONE);
            rv.setViewVisibility(R.id.dot_completed,     View.GONE);
            rv.setViewVisibility(R.id.calendar_day_dot,  View.GONE);
            rv.setViewVisibility(R.id.dot_debt,          View.GONE);
        } else {
            rv.setTextViewText(R.id.calendar_day_num, String.valueOf(d.day));

            if (d.isToday) {
                rv.setInt(R.id.calendar_day_num, "setBackgroundResource", R.drawable.widget_btn_blue);
                rv.setTextColor(R.id.calendar_day_num, 0xFFFFFFFF);
            } else if (d.weekend) {
                rv.setInt(R.id.calendar_day_num, "setBackgroundColor", 0x00000000);
                rv.setTextColor(R.id.calendar_day_num, 0xFF3B82F6);
            } else {
                rv.setInt(R.id.calendar_day_num, "setBackgroundColor", 0x00000000);
                rv.setTextColor(R.id.calendar_day_num, 0xFFCBD5E1);
            }

            rv.setViewVisibility(R.id.dot_pending,      d.hasPending   ? View.VISIBLE : View.GONE);
            rv.setViewVisibility(R.id.dot_completed,    d.hasCompleted ? View.VISIBLE : View.GONE);
            rv.setViewVisibility(R.id.calendar_day_dot, d.hasTx        ? View.VISIBLE : View.GONE);
            rv.setViewVisibility(R.id.dot_debt,         d.hasDebt      ? View.VISIBLE : View.GONE);
        }

        // Fill intent for tap → open app on that date
        Intent fill = new Intent();
        fill.putExtra("openDate", d.date);
        rv.setOnClickFillInIntent(R.id.calendar_day_bg, fill);

        return rv;
    }

    @Override public RemoteViews getLoadingView()  { return null; }
    @Override public int getViewTypeCount()         { return 1;    }
    @Override public long getItemId(int pos)        { return pos;  }
    @Override public boolean hasStableIds()         { return true; }

    static class DayItem {
        final int day;
        final boolean inMonth, isToday, weekend;
        final boolean hasTx, hasPending, hasCompleted, hasDebt;
        final String date;

        DayItem(int day, boolean inMonth, boolean isToday, boolean weekend,
                boolean hasTx, boolean hasPending, boolean hasCompleted, boolean hasDebt,
                String date) {
            this.day          = day;
            this.inMonth      = inMonth;
            this.isToday      = isToday;
            this.weekend      = weekend;
            this.hasTx        = hasTx;
            this.hasPending   = hasPending;
            this.hasCompleted = hasCompleted;
            this.hasDebt      = hasDebt;
            this.date         = date;
        }
    }
}
