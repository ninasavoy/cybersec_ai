# Guarda de Privacidade - Extensão de Navegador
### Nina Savoy de Sá

## Descrição

**Guarda de Privacidade** é uma extensão de navegador avançada desenvolvida para fornecer proteção máxima contra rastreamento online, fingerprinting, hijacking e outras técnicas invasivas de coleta de dados.

## Sistema de Pontuação

O **Score de Privacidade** é calculado com base nas ameaças detectadas:

| Evento | Pontos |
|--------|--------|
| Cookie de terceiro detectado | +1 |
| Rastreador bloqueado | +2 |
| Sincronismo de cookie | +2 |
| Fingerprinting detectado | +3 |
| Hijacking detectado | +5 |

### Níveis de Privacidade

- **0-10 pontos**: Excelente (Verde)  
- **11-30 pontos**: Bom (Azul)  
- **31-60 pontos**: Moderado (Laranja)  
- **60+ pontos**: Alto Risco (Vermelho)  

## Instalação

### Firefox

1. Abra o Firefox  
2. Digite `about:debugging` na barra de endereços  
3. Clique em "Este Firefox"  
4. Clique em "Carregar extensão temporária"  
5. Selecione o arquivo `manifest.json` do projeto  

### Chrome/Edge

1. Abra `chrome://extensions/`  
2. Ative o "Modo do desenvolvedor"  
3. Clique em "Carregar sem compactação"  
4. Selecione a pasta do projeto  

## Estrutura do Projeto

cyber_ai/
├── manifest.json # Configuração da extensão
├── background.js # Script de background (lógica de bloqueios, cookies, notificações)
├── content.js # Script de conteúdo (anti-hijacking e anti-fingerprinting)
├── popup.html # Interface do usuário
├── popup.css # Estilos da interface
├── popup.js # Lógica da interface
├── icon.png # Ícone da extensão
├── README.md # Esta documentação
└── teste-hijack.html # Página de teste para hijacking


> **Nota:** O `background.js` é responsável pelo gerenciamento do score, bloqueio de rastreadores e cookies, enquanto o `content.js` lida com detecção de hijacking, fingerprinting e manipulação direta da página.

## Como Usar

### 1. Visualizar Estatísticas
- Clique no ícone da extensão na barra de ferramentas
- Visualize o score de privacidade e estatísticas em tempo real

### 2. Configurar Proteções
- Ative/desative proteções específicas:
  - Bloqueio de cookies de terceiros
  - Proteção anti-fingerprint
  - Proteção anti-hijacking
  - Notificações

### 3. Gerenciar Whitelist
- Digite um domínio no campo de whitelist
- Clique em "Adicionar" para permitir o domínio
- Clique no "×" para remover da whitelist

### 4. Exportar Relatório
- Clique em "Exportar Relatório"
- Um arquivo JSON será baixado com todas as estatísticas

### 5. Limpar Dados
- "Limpar Dados": Remove todas as estatísticas  
- "Reset Score": Reseta apenas o score de privacidade  

## Testes

Use o arquivo `teste-hijack.html` para verificar a detecção de hijacking:

```bash
# Abra o arquivo no navegador com a extensão ativada
# Verifique os logs no console e no popup da extensão
```

## Contribuindo

Este é um projeto acadêmico desenvolvido para demonstrar conceitos avançados de segurança e privacidade web.

## Licença

Projeto desenvolvido para fins educacionais - Avaliação Intermediária de Cybersegurança.

# Autora

Desenvolvido como parte da Avaliação Intermediária - Nina Savoy de Sá
