# Instalador de Gráficos para Fivem/GTA.

## 📝 Descrição

O Instalador de Gráficos é uma aplicação desktop de código aberto que facilita a instalação, remoção e gerenciamento de pacotes gráficos para GTA V e FiveM. Construído com Electron, oferece uma interface intuitiva para lidar com mods gráficos sem necessidade de manipulação manual de arquivos.

## ✨ Funcionalidades

- **Instalação simplificada** de pacotes gráficos completos
- **Gerenciamento de diretórios** para MODS, PLUGINS e arquivos do GTA V
- **Backup automático** dos arquivos originais do jogo
- **Restauração de backup** com um clique
- **Desinstalação segura** sem afetar arquivos nativos do jogo
- **Portable** - sem necessidade de instalação

## 🚀 Como Usar

1. **Execute o arquivo portable** (.exe)
2. **Selecione os diretórios de origem**:
   - Pasta MODS do gráfico
   - Pasta PLUGINS do gráfico
   - Pasta GTA do gráfico

3. **Selecione os diretórios de destino**:
   - Diretório do GTA V (contendo GTA5.exe)
   - Diretório de MODS
   - Diretório de PLUGINS

4. **Utilize as funções**:
   - Instalar Gráficos
   - Desinstalar Gráficos
   - Restaurar Backup
   - Resetar configurações (botão ou Ctrl+Shift+R)

## 🛠️ Desenvolvimento

### Tecnologias Utilizadas

- **Electron**: Framework para criar aplicações desktop com tecnologias web
- **JavaScript**: Lógica principal da aplicação
- **HTML/CSS**: Interface de usuário
- **Node.js**: Ambiente de execução
- **electron-store**: Persistência de dados
- **fs-extra**: Manipulação avançada de arquivos


### Instalação e Execução

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/instalador-graficos.git
cd instalador-graficos

# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento
npm run dev

# Compilar para distribuição
npm run build           # Versão instalável
npm run build:portable  # Versão portable
```

## 📄 Licença

Este projeto é licenciado sob a [MIT License](LICENSE) - veja o arquivo LICENSE para detalhes.


**Nota:** Este projeto não é afiliado oficialmente à Rockstar Games, GTA V ou FiveM.
