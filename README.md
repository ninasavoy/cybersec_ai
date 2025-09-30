# Guarda de Privacidade
### Nina Savoy de Sá

Extensão de navegador desenvolvida para **proteger sua privacidade online** contra rastreadores, fingerprinting, hijacking e outras técnicas de monitoramento.  
Este projeto foi criado como parte de um trabalho de **Cybersegurança**.

## Funcionalidades

- **Bloqueio de Cookies de Terceiros**  
  Impede que sites usem cookies para rastrear sua navegação.

- **Proteção Anti-Fingerprinting**  
  Neutraliza tentativas de coleta de informações como:
  - Canvas
  - WebGL
  - AudioContext
  - Font Fingerprinting
  - Hardware/Memory Fingerprint
  - Battery API

- **Proteção Anti-Hijacking**  
  Detecta e bloqueia:
  - Injeções maliciosas de `setAttribute` e `addEventListener`
  - Redirecionamentos suspeitos (`window.location`)
  - Scripts inline maliciosos
  - Iframes de terceiros

- **Monitoramento em Tempo Real**  
  Interface popup que exibe estatísticas de:
  - Cookies bloqueados
  - Conexões bloqueadas
  - Fingerprints neutralizados
  - Hijacks detectados

- **Whitelist Personalizável**  
  Adicione domínios confiáveis que não devem ser bloqueados.

- **Relatórios Exportáveis**  
  Exporte logs em formato JSON para auditoria.

- **Notificações**  
  Receba alertas imediatos sobre ameaças detectadas.


## Estrutura do Projeto
cyber-ai/
├── manifest.json # Configuração da extensão
├── background.js # Script de background (lógica de bloqueios, cookies, notificações)
├── content.js # Script de conteúdo (anti-hijacking e anti-fingerprinting)
├── popup.html # Interface do usuário
├── popup.css # Estilos da interface
├── popup.js # Lógica da interface
├── icon.png # Ícone da extensão
├── README.md # Esta documentação
└── teste-hijack.html # Página de teste para hijacking

## Instalação

1. Clone ou baixe este repositório:
   ```bash
   git clone https://github.com/ninasavoy/cybersec_ai.git
   ```

2. Abra o navegador (Firefox ou Chrome).

3. Vá até o menu de extensões:

4. Firefox: about:debugging#/runtime/this-firefox

5. Chrome: chrome://extensions/

6. Clique em Carregar extensão sem compactação e selecione a pasta do projeto.

O ícone 🛡️ aparecerá na barra do navegador.

## Interface

Score de Privacidade: indica seu nível atual de proteção.

Estatísticas da Sessão: mostra cookies, conexões, fingerprints e hijacks bloqueados.

Controles: ativa/desativa proteções em tempo real.

Whitelist: permite configurar domínios confiáveis.

Logs Recentes: registra atividades suspeitas.


