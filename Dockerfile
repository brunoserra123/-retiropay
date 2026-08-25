FROM node:20

# Instala ferramentas necessárias para compilar o SQLite3 no Linux
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia e instala dependências do Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copia e instala dependências do Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install && npm rebuild sqlite3 --build-from-source

# Copia todo o código do projeto
COPY . .

# Compila o projeto (Frontend e Backend)
RUN cd backend && npm run build

# Configura o ambiente de produção
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Comando para iniciar o servidor
CMD ["sh", "-c", "cd backend && npm run start"]
