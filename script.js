let config = {
    graphicsModsDir: '',
    graphicsPluginsDir: '',
    graphicsGtaDir: '',
    
    gtaDir: '',
    modsDir: '',
    pluginsDir: ''
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, iniciando configuração da UI');
    
    try {
        const graphicsModsDirBtn = document.getElementById('graphics-mods-dir-btn');
        const graphicsPluginsDirBtn = document.getElementById('graphics-plugins-dir-btn');
        const graphicsGtaDirBtn = document.getElementById('graphics-gta-dir-btn');
        
        const graphicsModsDirInput = document.getElementById('graphics-mods-dir');
        const graphicsPluginsDirInput = document.getElementById('graphics-plugins-dir');
        const graphicsGtaDirInput = document.getElementById('graphics-gta-dir');
        
        const gtaDirBtn = document.getElementById('gta-dir-btn');
        const modsDirBtn = document.getElementById('mods-dir-btn');
        const pluginsDirBtn = document.getElementById('plugins-dir-btn');
        
        const gtaDirInput = document.getElementById('gta-dir');
        const modsDirInput = document.getElementById('mods-dir');
        const pluginsDirInput = document.getElementById('plugins-dir');
        
        const installBtn = document.getElementById('install-btn');
        const uninstallBtn = document.getElementById('uninstall-btn');
        const restoreBtn = document.getElementById('restore-btn');
        const statusText = document.getElementById('status-text');
        
        const notification = document.getElementById('notification');
        const notificationContent = document.getElementById('notification-content');
        const notificationClose = document.getElementById('notification-close');
        
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingMessage = document.getElementById('loading-message');

        const appState = {
            graphicsModsDir: '',
            graphicsPluginsDir: '',
            graphicsGtaDir: '',
            
            gtaDir: '',
            modsDir: '',
            pluginsDir: '',
            
            installing: false,
            uninstalling: false
        };


        const elements = {
            graphicsModsDirBtn, graphicsPluginsDirBtn, graphicsGtaDirBtn,
            graphicsModsDirInput, graphicsPluginsDirInput, graphicsGtaDirInput,
            gtaDirBtn, modsDirBtn, pluginsDirBtn,
            gtaDirInput, modsDirInput, pluginsDirInput,
            installBtn, uninstallBtn, statusText,
            notification, notificationContent, notificationClose,
            loadingOverlay, loadingMessage
        };
        
        const optionalElements = ['restoreBtn'];
        
        const missingElements = Object.entries(elements)
            .filter(([name, element]) => !element)
            .map(([name]) => name);
        
        if (missingElements.length > 0) {
            console.error('Elementos não encontrados:', missingElements);

            const criticalMissing = missingElements.filter(elem => !optionalElements.includes(elem));
            
            if (criticalMissing.length > 0) {
                alert(`Erro: Elementos críticos não encontrados na interface: ${criticalMissing.join(', ')}`);
                return;
            } else {
                console.warn('Elementos opcionais não encontrados, mas o aplicativo continuará funcionando');
            }
        }
        
        console.log('Verificação de elementos concluída');

        await loadSavedConfig();

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetConfigurations);
        }
        
        graphicsModsDirBtn.addEventListener('click', () => {
            selectDirectory('graphics-mods-dir');
        });
        
        graphicsPluginsDirBtn.addEventListener('click', () => {
            selectDirectory('graphics-plugins-dir');
        });
        
        graphicsGtaDirBtn.addEventListener('click', () => {
            selectDirectory('graphics-gta-dir');
        });
        
        gtaDirBtn.addEventListener('click', () => {
            selectDirectory('gta-dir');
        });
        
        modsDirBtn.addEventListener('click', () => {
            selectDirectory('mods-dir');
        });
        
        pluginsDirBtn.addEventListener('click', () => {
            selectDirectory('plugins-dir');
        });

        installBtn.addEventListener('click', installGraphics);
        uninstallBtn.addEventListener('click', uninstallGraphics);
        if (restoreBtn) {
            restoreBtn.addEventListener('click', restoreBackup);
        } else {
            console.warn('Botão de restauração não encontrado, funcionalidade desabilitada');
        }
        
        notificationClose.addEventListener('click', hideNotification);

        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                resetConfigurations();
                event.preventDefault();
            }
        });

        async function selectDirectory(type) {
            try {
                const result = await window.electronAPI.selectDirectory();
                
                if (!result) {
                    console.log('Seleção de diretório cancelada ou retornou valor nulo');
                    return;
                }
                
                if (!result.filePaths || !Array.isArray(result.filePaths) || result.filePaths.length === 0) {
                    console.log('Nenhum caminho de arquivo retornado na seleção:', result);
                    return;
                }
                
                const selectedPath = result.filePaths[0];
                
                if (!selectedPath) {
                    console.log('Caminho selecionado inválido');
                    return;
                }
                
                if (type === 'graphics-mods-dir') {
                    appState.graphicsModsDir = selectedPath;
                    graphicsModsDirInput.value = selectedPath;
                    config.graphicsModsDir = selectedPath;
                } else if (type === 'graphics-plugins-dir') {
                    appState.graphicsPluginsDir = selectedPath;
                    graphicsPluginsDirInput.value = selectedPath;
                    config.graphicsPluginsDir = selectedPath;
                } else if (type === 'graphics-gta-dir') {
                    appState.graphicsGtaDir = selectedPath;
                    graphicsGtaDirInput.value = selectedPath;
                    config.graphicsGtaDir = selectedPath;
                } 
                else if (type === 'gta-dir') {
                    appState.gtaDir = selectedPath;
                    gtaDirInput.value = selectedPath;
                    config.gtaDir = selectedPath;
                    await validateGtaDir(selectedPath);
                } else if (type === 'mods-dir') {
                    appState.modsDir = selectedPath;
                    modsDirInput.value = selectedPath;
                    config.modsDir = selectedPath;
                } else if (type === 'plugins-dir') {
                    appState.pluginsDir = selectedPath;
                    pluginsDirInput.value = selectedPath;
                    config.pluginsDir = selectedPath;
                }
                
                updateButtonStates();
                await saveConfig();
                console.log(`Diretório ${type} atualizado e configuração salva:`, selectedPath);
            } catch (error) {
                console.error('Erro ao selecionar diretório:', error);
                showNotification(`Erro ao selecionar diretório: ${error.message}`, 'error');
            }
        }

        async function validateGtaDir(dir) {
            try {
                const isValid = await window.electronAPI.checkDirectoryContents(dir, ['GTA5.exe']);
                
                if (!isValid) {
                    showNotification('O diretório selecionado não parece ser uma instalação válida do GTA V. Certifique-se de selecionar a pasta raiz que contém GTA5.exe.', 'warning');
                    return false;
                }
                
                return true;
            } catch (error) {
                showNotification(`Erro ao validar diretório do GTA V: ${error.message}`, 'error');
                return false;
            }
        }

        function updateButtonStates() {
            const hasSourceDirs = appState.graphicsModsDir || appState.graphicsPluginsDir || appState.graphicsGtaDir;
            const hasDestinationDirs = appState.gtaDir && appState.modsDir && appState.pluginsDir;
            
            const canInstall = hasSourceDirs && hasDestinationDirs;
            installBtn.disabled = !canInstall;
            
            uninstallBtn.disabled = !hasDestinationDirs;
            
            if (restoreBtn) {
                restoreBtn.disabled = !appState.gtaDir;
            }
            
            if (canInstall) {
                statusText.textContent = 'Pronto para instalar.';
            } else if (hasSourceDirs && !hasDestinationDirs) {
                statusText.textContent = 'Selecione todos os diretórios de destino para continuar.';
            } else if (!hasSourceDirs && hasDestinationDirs) {
                statusText.textContent = 'Selecione pelo menos um diretório de origem (gráfico) para continuar.';
            } else {
                statusText.textContent = 'Selecione os diretórios de origem e destino para continuar.';
            }
        }

        async function installGraphics() {
            const hasSourceDirs = appState.graphicsModsDir || appState.graphicsPluginsDir || appState.graphicsGtaDir;
            const hasDestinationDirs = appState.gtaDir && appState.modsDir && appState.pluginsDir;
            
            if (!hasSourceDirs || !hasDestinationDirs || appState.installing) {
                return;
            }
            
            appState.installing = true;
            showLoading('Instalando gráficos, por favor aguarde...');
            
            try {
                statusText.textContent = 'Instalando gráficos...';
                
                let installationResults = [];
                
                if (appState.graphicsModsDir) {
                    showLoading('Copiando arquivos MODS...');
                    
                    if (appState.graphicsModsDir === appState.modsDir) {
                        showNotification('Erro: A pasta de origem e destino dos MODS são idênticas. Selecione pastas diferentes.', 'error');
                    } else {
                        const modsResult = await window.electronAPI.copyDirectory(
                            appState.graphicsModsDir, 
                            appState.modsDir
                        );
                        installationResults.push({ type: 'MODS', result: modsResult });
                        
                        if (modsResult.success) {
                            showNotification('MODS instalados com sucesso!', 'success');
                        } else {
                            showNotification(`Erro ao instalar MODS: ${modsResult.message}`, 'error');
                        }
                    }
                }
                
                if (appState.graphicsPluginsDir) {
                    showLoading('Copiando arquivos PLUGINS...');
                    
                    if (appState.graphicsPluginsDir === appState.pluginsDir) {
                        showNotification('Erro: A pasta de origem e destino dos PLUGINS são idênticas. Selecione pastas diferentes.', 'error');
                    } else {
                        const pluginsResult = await window.electronAPI.copyDirectory(
                            appState.graphicsPluginsDir, 
                            appState.pluginsDir
                        );
                        installationResults.push({ type: 'PLUGINS', result: pluginsResult });
                        
                        if (pluginsResult.success) {
                            showNotification('PLUGINS instalados com sucesso!', 'success');
                        } else {
                            showNotification(`Erro ao instalar PLUGINS: ${pluginsResult.message}`, 'error');
                        }
                    }
                }
                
                if (appState.graphicsGtaDir) {
                    showLoading('Copiando arquivos para o GTA V...');
                    
                    if (appState.graphicsGtaDir === appState.gtaDir) {
                        showNotification('Erro: A pasta de origem e destino do GTA são idênticas. Selecione pastas diferentes.', 'error');
                    } else {
                        const gtaResult = await window.electronAPI.copyDirectory(
                            appState.graphicsGtaDir, 
                            appState.gtaDir
                        );
                        installationResults.push({ type: 'GTA', result: gtaResult });
                        
                        if (gtaResult.success) {
                            showNotification('Arquivos do GTA instalados com sucesso!', 'success');
                        } else {
                            showNotification(`Erro ao instalar arquivos do GTA: ${gtaResult.message}`, 'error');
                        }
                    }
                }
                
                hideLoading();
                
                const successCount = installationResults.filter(item => item.result && item.result.success).length;
                
                if (successCount > 0) {
                    statusText.textContent = 'Instalação concluída.';
                } else {
                    statusText.textContent = 'Falha na instalação.';
                }
            } catch (error) {
                hideLoading();
                showNotification(`Erro durante a instalação: ${error.message}`, 'error');
                statusText.textContent = 'Falha na instalação.';
            }
            
            appState.installing = false;
        }

        async function uninstallGraphics() {
            if (!appState.gtaDir || !appState.modsDir || !appState.pluginsDir || appState.uninstalling) {
                return;
            }
            
            if (!confirm('Tem certeza que deseja desinstalar os gráficos?')) {
                return;
            }
            
            appState.uninstalling = true;
            showLoading('Desinstalando gráficos, por favor aguarde...');
            
            try {
                statusText.textContent = 'Desinstalando gráficos...';
                
                if (appState.gtaDir && appState.graphicsGtaDir) {
                    showLoading('Removendo arquivos do GTA V...');
                    const gtaResult = await window.electronAPI.removeDirectory(
                        appState.graphicsGtaDir,
                        appState.gtaDir
                    );
                    
                    if (gtaResult && gtaResult.success) {
                        showNotification('Arquivos do GTA removidos com sucesso!', 'success');
                    } else {
                        showNotification('Falha ao remover arquivos do GTA V.', 'error');
                    }
                }
                
                if (appState.modsDir && appState.graphicsModsDir) {
                    showLoading('Removendo arquivos MODS...');
                    const modsResult = await window.electronAPI.removeDirectory(
                        appState.graphicsModsDir,
                        appState.modsDir
                    );
                    
                    if (modsResult && modsResult.success) {
                        showNotification('MODS removidos com sucesso!', 'success');
                    } else {
                        showNotification('Falha ao remover MODS.', 'error');
                    }
                }
                
                if (appState.pluginsDir && appState.graphicsPluginsDir) {
                    showLoading('Removendo arquivos PLUGINS...');
                    const pluginsResult = await window.electronAPI.removeDirectory(
                        appState.graphicsPluginsDir,
                        appState.pluginsDir
                    );
                    
                    if (pluginsResult && pluginsResult.success) {
                        showNotification('PLUGINS removidos com sucesso!', 'success');
                    } else {
                        showNotification('Falha ao remover PLUGINS.', 'error');
                    }
                }
                
                hideLoading();
                statusText.textContent = 'Desinstalação concluída.';
            } catch (error) {
                hideLoading();
                showNotification(`Erro durante a desinstalação: ${error.message}`, 'error');
                statusText.textContent = 'Falha na desinstalação.';
            }
            
            appState.uninstalling = false;
        }

        async function restoreBackup() {
            try {
                if (!config.gtaVInstallDir || !(await validateGTAVDir(config.gtaVInstallDir))) {
                    showNotification('Erro: Diretório de instalação do GTA V inválido!', 'error');
                    return;
                }

                showLoading('Restaurando backup...');
                updateStatus('Restaurando backup...');

                const backupDir = path.join(config.gtaVInstallDir, 'BACKUP_ORIGINAL');
                
                if (!fs.existsSync(backupDir)) {
                    hideLoading();
                    showNotification('Não foi encontrado um backup para restaurar!', 'error');
                    updateStatus('Falha na restauração: backup não encontrado.');
                    return;
                }
                
                const backupFiles = fs.readdirSync(backupDir);
                
                if (backupFiles.length === 0) {
                    hideLoading();
                    showNotification('O diretório de backup está vazio!', 'error');
                    updateStatus('Falha na restauração: backup vazio.');
                    return;
                }

                for (const file of backupFiles) {
                    const sourcePath = path.join(backupDir, file);
                    const destPath = path.join(config.gtaVInstallDir, file);
                    
                    if (fs.lstatSync(sourcePath).isDirectory()) {
                        await copyFolderRecursive(sourcePath, destPath);
                    } else {
                        fs.copyFileSync(sourcePath, destPath);
                    }
                }

                hideLoading();
                showNotification('Backup restaurado com sucesso!', 'success');
                updateStatus('Backup restaurado com sucesso!');
                
            } catch (error) {
                console.error('Erro ao restaurar backup:', error);
                hideLoading();
                showNotification(`Erro ao restaurar backup: ${error.message}`, 'error');
                updateStatus('Falha na restauração do backup.');
            }
        }

        function showNotification(message, type = 'info') {
            if (type === 'error') {
                console.error('Erro:', message);
                if (message.includes('undefined')) {
                    message = 'Erro ao selecionar diretório. Por favor, tente novamente ou escolha outro diretório.';
                }
            }

            notificationContent.textContent = message;
            notification.className = '';
            notification.classList.add('notification-' + type);
            notification.classList.remove('hidden');
            
            setTimeout(hideNotification, 5000);
        }
        
        function hideNotification() {
            notification.classList.add('hidden');
        }
        
        function showLoading(message) {
            if (message) {
                loadingMessage.textContent = message;
            }
            loadingOverlay.classList.remove('hidden');
        }
        
        function hideLoading() {
            loadingOverlay.classList.add('hidden');
        }

        async function saveConfig() {
            try {
                console.log('Frontend: Salvando configuração:', config);
                const result = await window.electronAPI.saveConfig(config);
                
                if (!result || !result.success) {
                    console.warn('Falha ao salvar via API, usando localStorage como fallback');
                    localStorage.setItem('graphics-installer-config', JSON.stringify(config));
                } else {
                    console.log('Configuração salva com sucesso via API');
                }
            } catch (error) {
                console.error('Erro ao salvar configuração via API, usando localStorage:', error);
                localStorage.setItem('graphics-installer-config', JSON.stringify(config));
            }
        }

        async function loadSavedConfig() {
            try {
                console.log('Frontend: Tentando carregar configuração via API');
                const result = await window.electronAPI.loadConfig();
                
                if (result && result.success && result.config) {
                    console.log('Configuração carregada da API:', result.config);
                    
                    config = {
                        ...config,
                        ...result.config
                    };
                    
                    console.log('Configuração final após merge:', config);
                    
                    if (config.graphicsModsDir) {
                        console.log('Definindo graphicsModsDir:', config.graphicsModsDir);
                        appState.graphicsModsDir = config.graphicsModsDir;
                        graphicsModsDirInput.value = config.graphicsModsDir;
                    }
                    
                    if (config.graphicsPluginsDir) {
                        console.log('Definindo graphicsPluginsDir:', config.graphicsPluginsDir);
                        appState.graphicsPluginsDir = config.graphicsPluginsDir;
                        graphicsPluginsDirInput.value = config.graphicsPluginsDir;
                    }
                    
                    if (config.graphicsGtaDir) {
                        console.log('Definindo graphicsGtaDir:', config.graphicsGtaDir);
                        appState.graphicsGtaDir = config.graphicsGtaDir;
                        graphicsGtaDirInput.value = config.graphicsGtaDir;
                    }
                    
                    if (config.gtaDir) {
                        console.log('Definindo gtaDir:', config.gtaDir);
                        appState.gtaDir = config.gtaDir;
                        gtaDirInput.value = config.gtaDir;
                    }
                    
                    if (config.modsDir) {
                        console.log('Definindo modsDir:', config.modsDir);
                        appState.modsDir = config.modsDir;
                        modsDirInput.value = config.modsDir;
                    }
                    
                    if (config.pluginsDir) {
                        console.log('Definindo pluginsDir:', config.pluginsDir);
                        appState.pluginsDir = config.pluginsDir;
                        pluginsDirInput.value = config.pluginsDir;
                    }
                    
                    console.log('Campos preenchidos, atualizando estado dos botões');
                    updateButtonStates();
                    console.log('Estado após carregamento:', { appState, form: {
                        graphicsModsDir: graphicsModsDirInput.value,
                        graphicsPluginsDir: graphicsPluginsDirInput.value,
                        graphicsGtaDir: graphicsGtaDirInput.value,
                        gtaDir: gtaDirInput.value,
                        modsDir: modsDirInput.value,
                        pluginsDir: pluginsDirInput.value
                    }});
                } else {
                    console.warn('API não retornou configuração válida, tentando localStorage');
                    const savedConfig = localStorage.getItem('graphics-installer-config');
                    if (savedConfig) {
                        config = JSON.parse(savedConfig);
                        console.log('Configuração carregada do localStorage:', config);
                        
                            if (config.graphicsModsDir) {
                            appState.graphicsModsDir = config.graphicsModsDir;
                            graphicsModsDirInput.value = config.graphicsModsDir;
                        }
                        
                        if (config.graphicsPluginsDir) {
                            appState.graphicsPluginsDir = config.graphicsPluginsDir;
                            graphicsPluginsDirInput.value = config.graphicsPluginsDir;
                        }
                        
                        if (config.graphicsGtaDir) {
                            appState.graphicsGtaDir = config.graphicsGtaDir;
                            graphicsGtaDirInput.value = config.graphicsGtaDir;
                        }
                        
                        if (config.gtaDir) {
                            appState.gtaDir = config.gtaDir;
                            gtaDirInput.value = config.gtaDir;
                        }
                        
                        if (config.modsDir) {
                            appState.modsDir = config.modsDir;
                            modsDirInput.value = config.modsDir;
                        }
                        
                        if (config.pluginsDir) {
                            appState.pluginsDir = config.pluginsDir;
                            pluginsDirInput.value = config.pluginsDir;
                        }
                        
                        updateButtonStates();
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar configuração:', error);
            }
        }

        function resetConfigurations() {
            try {
                config = {
                    graphicsModsDir: '',
                    graphicsPluginsDir: '',
                    graphicsGtaDir: '',
                    gtaDir: '',
                    modsDir: '',
                    pluginsDir: ''
                };
                
                appState.graphicsModsDir = '';
                appState.graphicsPluginsDir = '';
                appState.graphicsGtaDir = '';
                appState.gtaDir = '';
                appState.modsDir = '';
                appState.pluginsDir = '';
                
                graphicsModsDirInput.value = '';
                graphicsPluginsDirInput.value = '';
                graphicsGtaDirInput.value = '';
                gtaDirInput.value = '';
                modsDirInput.value = '';
                pluginsDirInput.value = '';
                
                saveConfig();
                
                updateButtonStates();
                
                statusText.textContent = 'Configurações resetadas para demonstração.';
                
                showNotification('Configurações resetadas com sucesso!', 'success');
                
                console.log('Configurações resetadas para demonstração');
            } catch (error) {
                console.error('Erro ao resetar configurações:', error);
                showNotification('Erro ao resetar configurações: ' + error.message, 'error');
            }
        }

        updateButtonStates();
        statusText.textContent = 'Aguardando seleção dos diretórios...';
    } catch (error) {
        console.error('Erro ao iniciar aplicativo:', error);
        alert(`Erro ao iniciar aplicativo: ${error.message}`);
    }
}); 