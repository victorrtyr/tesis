import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.get('/ping', (req, res) => {
    res.send("Conexion Funcional");
});

// Endpoint para entrenar el modelo
router.post('/modelo/entrenar', async (req, res) => {
    try {
        const modelPath = path.join(__dirname, '..', 'ml_model');
        const scriptPath = path.join(modelPath, 'train_model.py');
        
        const { stdout, stderr } = await execAsync(`python "${scriptPath}" train`, {
            cwd: modelPath
        });
        
        if (stderr && !stderr.includes('Precisión')) {
            return res.status(500).json({ error: stderr });
        }
        
        // Extraer la precisión del output
        const accuracyMatch = stdout.match(/Precisión del modelo: ([\d.]+)%/);
        const accuracy = accuracyMatch ? parseFloat(accuracyMatch[1]) : null;
        
        res.json({
            mensaje: 'Modelo entrenado exitosamente',
            precision: accuracy,
            output: stdout
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al entrenar el modelo',
            detalle: error.message 
        });
    }
});

// Endpoint para hacer predicciones
router.post('/modelo/prediccion', async (req, res) => {
    try {
        const { latitud, longitud, hora, dia_semana, mes, tipo_delito } = req.body;
        
        // Validar que todos los campos estén presentes
        if (latitud === undefined || longitud === undefined || hora === undefined || 
            dia_semana === undefined || mes === undefined || tipo_delito === undefined) {
            return res.status(400).json({ 
                error: 'Faltan parámetros requeridos',
                requeridos: ['latitud', 'longitud', 'hora', 'dia_semana', 'mes', 'tipo_delito']
            });
        }
        
        const modelPath = path.join(__dirname, '..', 'ml_model');
        const scriptPath = path.join(modelPath, 'train_model.py');
        
        // Verificar que el modelo existe
        const modelFile = path.join(modelPath, 'model.pkl');
        if (!fs.existsSync(modelFile)) {
            return res.status(404).json({ 
                error: 'Modelo no encontrado. Por favor, entrena el modelo primero.',
                endpoint: '/api/modelo/entrenar'
            });
        }
        
        // Preparar datos de entrada
        const inputData = {
            latitud: parseFloat(latitud),
            longitud: parseFloat(longitud),
            hora: parseInt(hora),
            dia_semana: parseInt(dia_semana),
            mes: parseInt(mes),
            tipo_delito: parseInt(tipo_delito)
        };
        
        // Ejecutar predicción usando spawn para pasar datos por stdin
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        const inputJson = JSON.stringify(inputData);
        
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(pythonCommand, [scriptPath, 'predict'], {
                cwd: modelPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
                if (code !== 0 || stderr) {
                    return res.status(500).json({ 
                        error: stderr || `Proceso terminó con código ${code}` 
                    });
                }
                
                try {
                    const result = JSON.parse(stdout);
                    res.json(result);
                } catch (parseError) {
                    res.status(500).json({ 
                        error: 'Error al parsear respuesta del modelo',
                        detalle: parseError.message,
                        output: stdout
                    });
                }
            });
            
            pythonProcess.on('error', (error) => {
                res.status(500).json({ 
                    error: 'Error al ejecutar el script Python',
                    detalle: error.message 
                });
            });
            
            // Enviar datos por stdin
            pythonProcess.stdin.write(inputJson);
            pythonProcess.stdin.end();
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al hacer la predicción',
            detalle: error.message 
        });
    }
});

// Endpoint para generar datos de ejemplo aleatorios
router.get('/modelo/datos-ejemplo', (req, res) => {
    const n = parseInt(req.query.n) || 10;
    
    const datos = [];
    for (let i = 0; i < n; i++) {
        datos.push({
            latitud: (Math.random() * 0.2 - 13.5).toFixed(6), // -13.5 a -13.3
            longitud: (Math.random() * 0.1 - 72.0).toFixed(6), // -72.0 a -71.9
            hora: Math.floor(Math.random() * 24),
            dia_semana: Math.floor(Math.random() * 7),
            mes: Math.floor(Math.random() * 12) + 1,
            tipo_delito: Math.floor(Math.random() * 5)
        });
    }
    
    res.json({
        cantidad: datos.length,
        datos: datos
    });
});

export default router;