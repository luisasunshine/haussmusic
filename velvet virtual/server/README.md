# Velvet Virtual API

Backend próprio da Velvet Virtual, separado do Velvet Music. Usa SQLite persistente e uploads locais.

## Desenvolvimento

1. Copie `.env.example` para `.env` e defina `JWT_SECRET`.
2. Instale dependências: `npm install`.
3. Rode `npm start`.

Para produção, publique esta pasta como um serviço Node separado e monte um volume persistente em `DATA_DIR` e `UPLOADS_DIR`.
