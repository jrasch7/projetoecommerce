import express from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

// Serve os arquivos da raiz (onde está o seu index.html)
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
    console.log(`⚡️[server]: Servidor da Elétrica Moro rodando em http://localhost:${PORT}`);
});