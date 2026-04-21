import express from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

// Agora o Express vai servir os arquivos de dentro da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    // Busca o index.html dentro da pasta public
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`⚡️[server]: Elétrica Moro rodando em http://localhost:${PORT}`);
});