import { registerPlugin } from '@capacitor/core';

export interface FileSavePlugin {
  saveBase64(options: { filename: string; data: string; mime: string }): Promise<{ path: string; ok: boolean }>;
  saveText(options: { filename: string; data: string; mime: string }): Promise<{ path: string; ok: boolean }>;
  openExportsFolder(): Promise<void>;
}

export const FileSave = registerPlugin<FileSavePlugin>('FileSave', {
  web: {
    saveBase64:        async () => ({ path: '', ok: false }),
    saveText:          async () => ({ path: '', ok: false }),
    openExportsFolder: async () => {},
  },
});
