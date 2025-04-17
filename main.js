const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const Store = require('electron-store');

const CONFIG_KEY = 'directories';
const DEFAULT_CONFIG = {
  graphicsModsDir: '',
  graphicsPluginsDir: '',
  graphicsGtaDir: '',
  gtaDir: '',
  modsDir: '',
  pluginsDir: ''
};


const userDataPath = app.getPath('userData');
console.log('Diretório de dados do aplicativo:', userDataPath);

try {
  const testFile = path.join(userDataPath, 'write-test.tmp');
  fs.writeFileSync(testFile, 'teste', { flag: 'w' });
  fs.unlinkSync(testFile);
  console.log('Diretório de dados tem permissões de escrita');
} catch (error) {
  console.error('ERRO: Não foi possível escrever no diretório de dados do aplicativo', error);
  const alternativeDir = path.join(os.homedir(), '.gta-graphics-installer');
  try {
    fs.ensureDirSync(alternativeDir);
    console.log('Usando diretório alternativo para armazenamento:', alternativeDir);
    app.setPath('userData', alternativeDir);
  } catch (dirError) {
    console.error('Não foi possível criar diretório alternativo:', dirError);
  }
}

const store = new Store({
  name: 'app-config',
  cwd: userDataPath
});

console.log('Verificando configuração existente:', store.get(CONFIG_KEY));

if (!store.has(CONFIG_KEY)) {
  console.log('Inicializando configuração com valores padrão');
  store.set(CONFIG_KEY, DEFAULT_CONFIG);
}

const configFilePath = path.join(app.getPath('userData'), 'config.json');

  
const backupDir = path.join(os.tmpdir(), 'gta-graphics-installer-backups');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');

}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('load-config', (event) => {
  try {
    const config = store.get(CONFIG_KEY, DEFAULT_CONFIG);
    console.log('Carregando configuração:', config);
    return { success: true, config };
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-config', (event, config) => {
  try {
    console.log('Salvando configuração:', config);
    store.set(CONFIG_KEY, config);
    const savedConfig = store.get(CONFIG_KEY);
    console.log('Configuração após salvar:', savedConfig);
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-directory', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result) {
      console.log('Dialog retornou valor indefinido');
      return { canceled: true, filePaths: [] };
    }
    
    console.log('Diretório selecionado:', result);
    return result;
  } catch (error) {
    console.error('Erro ao abrir diálogo de seleção:', error);
    return { canceled: true, filePaths: [], error: error.message };
  }
});

ipcMain.handle('check-directory', async (event, dirPath) => {
  try {
    if (!dirPath) return { exists: false };
    const exists = await fs.pathExists(dirPath);
    return { exists };
  } catch (error) {
    console.error('Erro ao verificar diretório:', error);
    return { exists: false, error: error.message };
  }
});

ipcMain.handle('check-directory-contents', async (event, dirPath, requiredItems) => {
  try {
    const exists = await fs.pathExists(dirPath);
    if (!exists) return { valid: false, message: 'Diretório não encontrado' };
    
    const results = {};
    let valid = true;
    
    for (const item of requiredItems) {
      const itemPath = path.join(dirPath, item);
      const itemExists = await fs.pathExists(itemPath);
      results[item] = itemExists;
      if (!itemExists) valid = false;
    }
    
    return {
      valid,
      results,
      message: valid ? 'Diretório válido' : 'Faltam arquivos ou pastas necessários'
    };
  } catch (error) {
    console.error('Erro ao verificar diretório:', error);
    return { valid: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('backup-files', async (event, dirPath) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    
    await fs.ensureDir(backupPath);
    
    const graphicsDirs = [
      'x64/data/textures',
      'x64/data/shaders',
      'x64/data/graphics',
      'mods/update/x64',
      'mods/x64',
      'plugins'
    ];
    
    let backupSuccess = false;
    
    for (const dir of graphicsDirs) {
      const sourcePath = path.join(dirPath, dir);
      const targetPath = path.join(backupPath, dir);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
        backupSuccess = true;
        console.log(`Backup realizado: ${sourcePath} -> ${targetPath}`);
      }
    }
    
    if (!backupSuccess) {
      const specialFiles = [
        'd3d9.dll', 'd3d11.dll', 'dxgi.dll',
        'reshade.ini', 'enbseries.ini', 'enblocal.ini'
      ];
      
      for (const file of specialFiles) {
        const sourcePath = path.join(dirPath, file);
        const targetPath = path.join(backupPath, file);
        
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, targetPath);
          backupSuccess = true;
          console.log(`Backup realizado: ${sourcePath} -> ${targetPath}`);
        }
      }
    }
    
    await fs.writeJSON(path.join(backupPath, 'backup-info.json'), {
      originalPath: dirPath,
      timestamp: new Date().toISOString(),
      directories: graphicsDirs
    });
    
    return {
      success: backupSuccess,
      backupPath,
      message: backupSuccess 
        ? 'Backup concluído com sucesso' 
        : 'Nenhum arquivo relevante foi encontrado para backup. Continuando mesmo assim.'
    };
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    return {
      success: false,
      message: `Erro ao fazer backup: ${error.message}`
    };
  }
});

ipcMain.handle('copy-graphics-to-gta', async (event, sourcePath, gtaPath) => {
  try {
    const dirsToCopy = {
      'mods': 'mods',
      'x64': 'x64',
      'update': 'update',
      'plugins': 'plugins',
      'shaders': 'shaders',
      'reshade-shaders': 'reshade-shaders',
      'textures': 'textures'
    };
    
    let modsCopied = 0;
    
    for (const [sourceDir, targetDir] of Object.entries(dirsToCopy)) {
      const srcPath = path.join(sourcePath, sourceDir);
      const destPath = path.join(gtaPath, targetDir);
      
      if (await fs.pathExists(srcPath)) {
        console.log(`Copiando ${srcPath} para ${destPath}`);
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath, { overwrite: true });
        modsCopied++;
      }
    }
    
    const rootFiles = await fs.readdir(sourcePath);
    for (const file of rootFiles) {
      if (file.endsWith('.asi') || file.endsWith('.ini') || file.includes('reshade') || file.includes('enb')) {
        const srcFile = path.join(sourcePath, file);
        const destFile = path.join(gtaPath, file);
        
        if ((await fs.stat(srcFile)).isFile()) {
          console.log(`Copiando arquivo ${srcFile} para ${destFile}`);
          await fs.copy(srcFile, destFile, { overwrite: true });
          modsCopied++;
        }
      }
    }
    
    return {
      success: modsCopied > 0,
      message: modsCopied > 0 
        ? `Gráficos instalados com sucesso no GTA V (${modsCopied} itens copiados)`
        : 'Nenhum arquivo gráfico compatível encontrado para copiar'
    };
  } catch (error) {
    console.error('Erro ao copiar gráficos para GTA V:', error);
    return {
      success: false,
      message: `Erro ao instalar gráficos: ${error.message}`
    };
  }
});

ipcMain.handle('copy-graphics-to-fivem', async (event, sourcePath, fivemPath) => {
  try {
    const possibleFivemDirs = [
      path.join(fivemPath, 'FiveM.app', 'data'),
      path.join(fivemPath, 'citizen'),
      fivemPath
    ];
    
    let validFivemDir = null;
    for (const dir of possibleFivemDirs) {
      if (await fs.pathExists(dir)) {
        validFivemDir = path.dirname(dir);
        break;
      }
    }
    
    if (!validFivemDir) {
      return {
        success: false,
        message: 'Diretório FiveM inválido. Certifique-se de selecionar a pasta raiz do FiveM.'
      };
    }
    
    const modsFolders = ['mods', 'plugins', 'addons', 'fivem'];
    let modsCopied = 0;
    
    const fivemDirs = {
      'mods': path.join('citizen', 'common', 'data'),
      'plugins': path.join('plugins'),
      'reshade-shaders': path.join('reshade-shaders'),
      'textures': path.join('citizen', 'common', 'data', 'textures')
    };
    
    for (const folder of modsFolders) {
      const fivemModsPath = path.join(sourcePath, folder);
      
      if (await fs.pathExists(fivemModsPath)) {
        const fivemFiles = await fs.readdir(fivemModsPath);
        
        for (const file of fivemFiles) {
          const srcFile = path.join(fivemModsPath, file);
          const destFile = path.join(fivemPath, file);
          
          if ((await fs.stat(srcFile)).isFile()) {
            console.log(`Copiando arquivo FiveM ${srcFile} para ${destFile}`);
            await fs.copy(srcFile, destFile, { overwrite: true });
            modsCopied++;
          } else if ((await fs.stat(srcFile)).isDirectory()) {
            console.log(`Copiando diretório FiveM ${srcFile} para ${destFile}`);
            await fs.ensureDir(destFile);
            await fs.copy(srcFile, destFile, { overwrite: true });
            modsCopied++;
          }
        }
      }
    }
    
    for (const [sourceDir, targetDir] of Object.entries(fivemDirs)) {
      const srcPath = path.join(sourcePath, sourceDir);
      
      if (await fs.pathExists(srcPath)) {
        const destPath = path.join(fivemPath, targetDir);
        console.log(`Copiando ${srcPath} para ${destPath}`);
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath, { overwrite: true });
        modsCopied++;
      }
    }
    
    return {
      success: modsCopied > 0,
      message: modsCopied > 0 
        ? `Gráficos instalados com sucesso no FiveM (${modsCopied} itens copiados)`
        : 'Nenhum arquivo gráfico compatível encontrado para o FiveM'
    };
  } catch (error) {
    console.error('Erro ao copiar gráficos para FiveM:', error);
    return {
      success: false,
      message: `Erro ao instalar gráficos no FiveM: ${error.message}`
    };
  }
});

ipcMain.handle('restore-backup', async (event, backupPath) => {
  try {
    const backupInfo = await fs.readJSON(path.join(backupPath, 'backup-info.json'));
    const originalPath = backupInfo.originalPath;
    
    for (const dir of backupInfo.directories) {
      const sourcePath = path.join(backupPath, dir);
      const targetPath = path.join(originalPath, dir);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath, { overwrite: true });
      }
    }
    
    return {
      success: true,
      message: 'Backup restaurado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return {
      success: false,
      message: `Erro ao restaurar backup: ${error.message}`
    };
  }
});

ipcMain.handle('install-graphics', async (event, config) => {
  try {
    const { graphicsRoot, gta5Directory, fivemModsDirectory, fivemPluginsDirectory } = config;
    
    if (!graphicsRoot || !await fs.pathExists(graphicsRoot)) {
      return { success: false, error: 'Diretório raiz de gráficos inválido.' };
    }
    
    if (!gta5Directory || !await fs.pathExists(gta5Directory)) {
      return { success: false, error: 'Diretório do GTA V inválido.' };
    }
    
    if (fivemModsDirectory && !await fs.pathExists(fivemModsDirectory)) {
      return { success: false, error: 'Diretório de mods do FiveM inválido.' };
    }
    
    if (fivemPluginsDirectory && !await fs.pathExists(fivemPluginsDirectory)) {
      return { success: false, error: 'Diretório de plugins do FiveM inválido.' };
    }
    
    mainWindow.webContents.send('installation-progress', { step: 'start', message: 'Iniciando instalação...' });
    
    mainWindow.webContents.send('installation-progress', { step: 'gta5', message: 'Instalando gráficos para GTA V...' });
    
    const gtaGraphicsFiles = await getGraphicsFiles(graphicsRoot, 'gta5');
    if (gtaGraphicsFiles.length > 0) {
      await copyFiles(gtaGraphicsFiles, graphicsRoot, gta5Directory);
    }
    
    if (fivemModsDirectory) {
      mainWindow.webContents.send('installation-progress', { step: 'fivem-mods', message: 'Instalando mods para FiveM...' });
      
      const fivemModsFiles = await getGraphicsFiles(graphicsRoot, 'fivemMods');
      if (fivemModsFiles.length > 0) {
        await copyFiles(fivemModsFiles, graphicsRoot, fivemModsDirectory);
      }
    }
    
    if (fivemPluginsDirectory) {
      mainWindow.webContents.send('installation-progress', { step: 'fivem-plugins', message: 'Instalando plugins para FiveM...' });
      
      const fivemPluginsFiles = await getGraphicsFiles(graphicsRoot, 'fivemPlugins');
      if (fivemPluginsFiles.length > 0) {
        await copyFiles(fivemPluginsFiles, graphicsRoot, fivemPluginsDirectory);
      }
    }
    
    mainWindow.webContents.send('installation-progress', { step: 'complete', message: 'Instalação concluída com sucesso!' });
    return { success: true };
  } catch (error) {
    console.error('Erro durante a instalação:', error);
    mainWindow.webContents.send('installation-progress', { step: 'error', message: `Erro: ${error.message}` });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('uninstall-graphics', async (event, config) => {
  try {
    const { gta5Directory, modsDirectory, pluginsDirectory } = config;
    
    let validDirs = 0;
    let totalRemoved = 0;
    
    mainWindow.webContents.send('uninstallation-progress', { step: 'start', message: 'Iniciando desinstalação...' });
    
    if (gta5Directory && await fs.pathExists(gta5Directory)) {
      validDirs++;
      mainWindow.webContents.send('uninstallation-progress', { step: 'gta5', message: 'Removendo gráficos do GTA V...' });
      const removedCount = await removeGraphicsFromDirectory(gta5Directory);
      totalRemoved += removedCount;
    }
    
    if (modsDirectory && await fs.pathExists(modsDirectory)) {
      validDirs++;
      mainWindow.webContents.send('uninstallation-progress', { step: 'mods', message: 'Removendo MODS...' });
      const removedCount = await removeGraphicsFromDirectory(modsDirectory);
      totalRemoved += removedCount;
    }
    
    if (pluginsDirectory && await fs.pathExists(pluginsDirectory)) {
      validDirs++;
      mainWindow.webContents.send('uninstallation-progress', { step: 'plugins', message: 'Removendo PLUGINS...' });
      const removedCount = await removeGraphicsFromDirectory(pluginsDirectory);
      totalRemoved += removedCount;
    }
    
    mainWindow.webContents.send('uninstallation-progress', { 
      step: 'complete', 
      message: `Desinstalação concluída com sucesso! Removidos ${totalRemoved} itens.`
    });
    
    return { 
      success: totalRemoved > 0,
      message: `Desinstalação ${totalRemoved > 0 ? 'concluída' : 'falhou'}. ${totalRemoved} itens removidos.`,
      removedCount: totalRemoved
    };
  } catch (error) {
    console.error('Erro durante a desinstalação:', error);
    mainWindow.webContents.send('uninstallation-progress', { step: 'error', message: `Erro: ${error.message}` });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-directory', async (event, sourcePath, destPath) => {
  try {
    if (!sourcePath || !destPath) {
      console.error('Caminhos de origem ou destino inválidos', { sourcePath, destPath });
      return { success: false, message: 'Caminhos de origem ou destino inválidos' };
    }

    console.log(`Copiando de ${sourcePath} para ${destPath}`);
    
    const sourceExists = await fs.pathExists(sourcePath);
    if (!sourceExists) {
      return { success: false, message: `Diretório de origem não existe: ${sourcePath}` };
    }
    
    const sourceStats = await fs.stat(sourcePath);
    if (!sourceStats.isDirectory()) {
      return { success: false, message: `Caminho de origem não é um diretório: ${sourcePath}` };
    }
    
    await fs.ensureDir(destPath);
    
    await fs.copy(sourcePath, destPath, { overwrite: true });
    
    return { success: true, message: `Diretório copiado com sucesso de ${sourcePath} para ${destPath}` };
  } catch (error) {
    console.error('Erro ao copiar diretório:', error);
    return { success: false, message: `Erro ao copiar diretório: ${error.message}` };
  }
});

ipcMain.handle('remove-directory', async (event, sourcePath, destPath) => {
  try {
    if (!sourcePath || !destPath) {
      console.error('Caminhos de origem ou destino inválidos', { sourcePath, destPath });
      return { success: false, message: 'Caminhos de origem ou destino inválidos' };
    }

    console.log(`Removendo arquivos de ${sourcePath} em ${destPath}`);
    
    const sourceExists = await fs.pathExists(sourcePath);
    const destExists = await fs.pathExists(destPath);
    
    if (!sourceExists) {
      return { success: false, message: `Diretório de origem não existe: ${sourcePath}` };
    }
    
    if (!destExists) {
      return { success: false, message: `Diretório de destino não existe: ${destPath}` };
    }
    
    let removedCount = 0;
    
    const items = await fs.readdir(sourcePath);
    
    for (const item of items) {
      const sourcePath_item = path.join(sourcePath, item);
      const destPath_item = path.join(destPath, item);
      
      const itemExistsInDest = await fs.pathExists(destPath_item);
      
      if (itemExistsInDest) {
        const stats = await fs.stat(sourcePath_item);
        
        if (stats.isDirectory()) {
          await fs.remove(destPath_item);
        } else {
          await fs.unlink(destPath_item);
        }
        
        removedCount++;
      }
    }
    
    return { 
      success: true, 
      message: `${removedCount} itens removidos com sucesso de ${destPath}`,
      removedCount 
    };
  } catch (error) {
    console.error('Erro ao remover arquivos:', error);
    return { success: false, message: `Erro ao remover arquivos: ${error.message}` };
  }
});

async function getGraphicsFiles(rootDir, type) {
  try {
    const typeDirs = {
      gta5: ['gta5', 'gta v', 'gta', 'grand theft auto v', 'grand theft auto'],
      fivemMods: ['fivem/mods', 'fivem-mods', 'fivem_mods', 'mods'],
      fivemPlugins: ['fivem/plugins', 'fivem-plugins', 'fivem_plugins', 'plugins']
    };
    
    const possibleDirs = typeDirs[type] || [];
    let allFiles = [];
    
    for (const dir of possibleDirs) {
      const dirPath = path.join(rootDir, dir);
      if (await fs.pathExists(dirPath)) {
        const files = await getFiles(dirPath);
        allFiles.push(...files.map(file => ({
          source: file,
          relativePath: path.relative(dirPath, file)
        })));
      }
    }
    
    if (allFiles.length === 0 && type === 'gta5') {
      const rootFiles = await getFiles(rootDir);
      allFiles.push(...rootFiles.map(file => ({
        source: file,
        relativePath: path.relative(rootDir, file)
      })));
    }
    
    return allFiles;
  } catch (error) {
    console.error(`Erro ao buscar arquivos de gráficos (${type}):`, error);
    return [];
  }
}

async function getFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? getFiles(fullPath) : fullPath;
  }));
  return files.flat();
}

async function copyFiles(filesList, sourceRoot, destRoot) {
  for (const file of filesList) {
    const destPath = path.join(destRoot, file.relativePath);
    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(file.source, destPath, { overwrite: true });
  }
}

async function removeGraphicsFromDirectory(directory) {

  const specificFiles = [
    'ByLicense.txt',
    'd3d11.dll',
    'd3d12.dll', 
    'd3dcompiler_46e.dll',
    'enbfeeder.asi',
    'enbfeeder.ini',
    'enblocal.ini',
    'enbseries.ini'
  ];
    
  const specificDirs = [
    'enbseries',
    'shaderinput'
  ];
  
  let itemsRemoved = 0;
  
  for (const file of specificFiles) {
    const filePath = path.join(directory, file);
    try {
      if (await fs.pathExists(filePath)) {
        console.log(`Removendo arquivo ${filePath}`);
        await fs.remove(filePath);
        itemsRemoved++;
      }
    } catch (error) {
      console.error(`Erro ao remover arquivo ${filePath}:`, error);
    }
  }
  
  for (const dir of specificDirs) {
    const dirPath = path.join(directory, dir);
    try {
      if (await fs.pathExists(dirPath)) {
        console.log(`Removendo diretório ${dirPath}`);
        await fs.remove(dirPath);
        itemsRemoved++;
      }
    } catch (error) {
      console.error(`Erro ao remover diretório ${dirPath}:`, error);
    }
  }
  
  return itemsRemoved;
}

async function findBackups(directory) {
  try {
    if (!await fs.pathExists(backupDir)) {
      return [];
    }
    
    const backups = [];
    const backupDirs = await fs.readdir(backupDir);
    
    for (const backupName of backupDirs) {
      const backupPath = path.join(backupDir, backupName);
      const infoPath = path.join(backupPath, 'backup-info.json');
      
      if (await fs.pathExists(infoPath)) {
        try {
          const info = await fs.readJSON(infoPath);
          if (info.originalPath === directory) {
            backups.push({
              path: backupPath,
              timestamp: info.timestamp ? new Date(info.timestamp) : new Date(0)
            });
          }
        } catch (error) {
          console.error(`Erro ao ler informações de backup ${infoPath}:`, error);
        }
      }
    }
    
    backups.sort((a, b) => b.timestamp - a.timestamp);
    
    return backups.map(backup => backup.path);
  } catch (error) {
    console.error('Erro ao encontrar backups:', error);
    return [];
  }
}

async function glob(pattern) {
  const basePath = path.dirname(pattern);
  const baseName = path.basename(pattern).replace('*', '');
  
  try {
    if (!await fs.pathExists(basePath)) return [];
    
    const entries = await fs.readdir(basePath);
    return entries
      .filter(entry => entry.includes(baseName))
      .map(entry => path.join(basePath, entry));
  } catch (error) {
    console.error(`Erro ao buscar padrão ${pattern}:`, error);
    return [];
  }
} 