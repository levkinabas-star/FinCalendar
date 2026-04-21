package com.budgettracker.app;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Base64;

@CapacitorPlugin(name = "FileSave")
public class FileSavePlugin extends Plugin {

    private static final String SUBFOLDER = "FinCalendar";

    @PluginMethod
    public void saveBase64(PluginCall call) {
        String filename = call.getString("filename", "export.bin");
        String base64   = call.getString("data", "");
        String mime     = call.getString("mime", "application/octet-stream");

        try {
            byte[] bytes = Base64.getDecoder().decode(base64);
            String path  = writeToDownloads(getContext(), filename, mime, bytes);
            call.resolve(new JSObject().put("path", path).put("ok", true));
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void saveText(PluginCall call) {
        String filename = call.getString("filename", "export.txt");
        String text     = call.getString("data", "");
        String mime     = call.getString("mime", "text/plain");

        try {
            byte[] bytes = text.getBytes("UTF-8");
            String path  = writeToDownloads(getContext(), filename, mime, bytes);
            call.resolve(new JSObject().put("path", path).put("ok", true));
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openExportsFolder(PluginCall call) {
        try {
            // Try to open Downloads/Megacalendar via the Documents provider
            String encoded = "primary%3ADownload%2F" + SUBFOLDER;
            Uri folderUri = Uri.parse("content://com.android.externalstorage.documents/document/" + encoded);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(folderUri, DocumentsContract.Document.MIME_TYPE_DIR);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(intent);
            } else {
                // Fallback: open root Downloads
                Uri downloadsUri = Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload");
                Intent fallback = new Intent(Intent.ACTION_VIEW);
                fallback.setDataAndType(downloadsUri, DocumentsContract.Document.MIME_TYPE_DIR);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open folder: " + e.getMessage());
        }
    }

    private String writeToDownloads(Context ctx, String filename, String mime, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ — MediaStore API, saves to Downloads/Megacalendar/
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/" + SUBFOLDER);
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri itemUri = ctx.getContentResolver().insert(collection, values);
            if (itemUri == null) throw new Exception("Cannot create MediaStore entry");

            try (OutputStream os = ctx.getContentResolver().openOutputStream(itemUri)) {
                if (os == null) throw new Exception("Cannot open output stream");
                os.write(bytes);
            }

            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            ctx.getContentResolver().update(itemUri, values, null, null);

            return "Загрузки/" + SUBFOLDER + "/" + filename;
        } else {
            // Android 9 and below — direct file write to Downloads/Megacalendar/
            File dir = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                SUBFOLDER
            );
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, filename);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(bytes);
            }
            return file.getAbsolutePath();
        }
    }
}
