// app.js
import express from "express";
import cors from 'cors';
import 'dotenv/config';
import routes from './routes/routes.js';

const PORT = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Usa el router en el prefijo /api
app.use('/api/', routes); // Rutas generales

app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});
