# Modelo Random Forest - Predicción de Riesgo Delictivo

## Descripción

Modelo de prueba simple que utiliza Random Forest para predecir niveles de riesgo delictivo en la ciudad de Cusco, utilizando datos generados aleatoriamente.

## Requisitos

- Python 3.7 o superior
- Las dependencias listadas en `requirements.txt`

## Instalación

1. Instala las dependencias de Python:

```bash
pip install -r requirements.txt
```

## Uso

### Entrenar el modelo

```bash
python train_model.py train
```

Esto generará:
- 1000 muestras de datos aleatorios
- Un modelo entrenado guardado en `model.pkl`
- La precisión del modelo en la consola

### Hacer una predicción

```bash
echo '{"latitud": -13.5319, "longitud": -71.9675, "hora": 20, "dia_semana": 5, "mes": 12, "tipo_delito": 0}' | python train_model.py predict
```

## Variables del Modelo

- **latitud**: Coordenada latitud (rango: -13.5 a -13.3 para Cusco)
- **longitud**: Coordenada longitud (rango: -72.0 a -71.9 para Cusco)
- **hora**: Hora del día (0-23)
- **dia_semana**: Día de la semana (0-6, donde 0=lunes)
- **mes**: Mes del año (1-12)
- **tipo_delito**: Tipo de delito histórico (0-4: robo, asalto, hurto, violencia, otros)

## Niveles de Riesgo

- **0**: Bajo
- **1**: Medio
- **2**: Alto

## Notas

Este es un modelo de prueba con datos generados aleatoriamente. Para un modelo de producción, se necesitarían datos reales de delitos históricos de la ciudad de Cusco.

