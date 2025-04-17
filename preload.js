const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {

  selectDirectory: async () => {
    try {
      const result = await ipcRenderer.invoke('select-directory');
      if (!result) {
        return { canceled: true, filePaths: [] };
      }
      return result;
    } catch (error) {
      console.error('Erro ao selecionar diretório no preload:', error);
      return { canceled: true, filePaths: [], error: error.message };
    }
  },
  
  checkDirectory: (dirPath) => 
    ipcRenderer.invoke('check-directory', dirPath),
  checkDirectoryContents: (dirPath, requiredItems) => 
    ipcRenderer.invoke('check-directory-contents', dirPath, requiredItems),
  
  backupFiles: (dirPath) => ipcRenderer.invoke('backup-files', dirPath),
  copyGraphicsToGta: (sourcePath, gtaPath) => 
    ipcRenderer.invoke('copy-graphics-to-gta', sourcePath, gtaPath),
  copyGraphicsToFiveM: (sourcePath, fivemPath) => 
    ipcRenderer.invoke('copy-graphics-to-fivem', sourcePath, fivemPath),
  copyDirectory: (sourcePath, destPath) => 
    ipcRenderer.invoke('copy-directory', sourcePath, destPath),
  removeDirectory: (sourcePath, destPath) => 
    ipcRenderer.invoke('remove-directory', sourcePath, destPath),
  
  restoreBackup: (dirPath) => ipcRenderer.invoke('restore-backup', dirPath),
  uninstallGraphics: (config) => ipcRenderer.invoke('uninstall-graphics', config),
  
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config')
}); 