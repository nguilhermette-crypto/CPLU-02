# CPLU - Controle de Frota

Este projeto é um aplicativo de controle de abastecimento para a frota CPLU, permitindo o registro de abastecimentos por turno, controle de KM, cálculo de consumo e geração de relatórios em PDF.

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn

### Passo a Passo
1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/nguilhermette-crypto/CPLU.git
   cd CPLU
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar o Firebase:**
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
   - Ative o **Firestore Database** e o **Firebase Authentication** (Google Login).
   - Crie um arquivo `firebase-applet-config.json` na raiz do projeto com as suas credenciais:
     ```json
     {
       "apiKey": "SUA_API_KEY",
       "authDomain": "SEU_AUTH_DOMAIN",
       "projectId": "SEU_PROJECT_ID",
       "appId": "SEU_APP_ID",
       "firestoreDatabaseId": "(default)"
     }
     ```

4. **Rodar o projeto:**
   ```bash
   npm run dev
   ```
   O aplicativo estará disponível em `http://localhost:3000`.

## 🛠️ Comandos Git para Subir o Projeto

Se você já tem o repositório criado e quer subir os arquivos atuais:

1. **Inicializar o Git (se necessário):**
   ```bash
   git init
   ```

2. **Adicionar o repositório remoto:**
   ```bash
   git remote add origin https://github.com/nguilhermette-crypto/CPLU.git
   ```

3. **Adicionar todos os arquivos:**
   ```bash
   git add .
   ```

4. **Fazer o commit:**
   ```bash
   git commit -m "Initial commit: CPLU Fleet Control App"
   ```

5. **Fazer o push:**
   ```bash
   git push -u origin main
   ```

## 📂 Estrutura do Projeto
- `src/`: Código fonte do frontend (React + Vite).
- `src/components/`: Componentes reutilizáveis.
- `src/lib/`: Utilitários (como o `cn` para Tailwind).
- `src/firebase.ts`: Configuração e serviços do Firebase.
- `firestore.rules`: Regras de segurança do Firestore.
- `firebase-blueprint.json`: Documentação da estrutura de dados.
