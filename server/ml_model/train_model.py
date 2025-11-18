"""
Script simple para entrenar un modelo Random Forest con datos generados aleatoriamente
para predecir niveles de riesgo delictivo en Cusco
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pickle
import json
import sys

def generate_random_data(n_samples=1000):
    """
    Genera datos aleatorios simulando variables espacio-temporales
    Variables:
    - latitud: coordenada latitud (simulada para Cusco: -13.5 a -13.3)
    - longitud: coordenada longitud (simulada para Cusco: -72.0 a -71.9)
    - hora: hora del día (0-23)
    - dia_semana: día de la semana (0-6, donde 0=lunes)
    - mes: mes del año (1-12)
    - tipo_delito: tipo de delito histórico (0-4: robo, asalto, hurto, violencia, otros)
    """
    np.random.seed(42)
    
    data = {
        'latitud': np.random.uniform(-13.5, -13.3, n_samples),
        'longitud': np.random.uniform(-72.0, -71.9, n_samples),
        'hora': np.random.randint(0, 24, n_samples),
        'dia_semana': np.random.randint(0, 7, n_samples),
        'mes': np.random.randint(1, 13, n_samples),
        'tipo_delito': np.random.randint(0, 5, n_samples)
    }
    
    df = pd.DataFrame(data)
    
    # Generar nivel de riesgo (0=bajo, 1=medio, 2=alto) basado en patrones simples
    # Simulamos que el riesgo es mayor en ciertas horas y zonas
    riesgo = np.zeros(n_samples)
    
    for i in range(n_samples):
        score = 0
        # Mayor riesgo en horas nocturnas (20-6)
        if df.loc[i, 'hora'] >= 20 or df.loc[i, 'hora'] <= 6:
            score += 2
        elif df.loc[i, 'hora'] >= 18 or df.loc[i, 'hora'] <= 8:
            score += 1
            
        # Mayor riesgo en fines de semana (5=sábado, 6=domingo)
        if df.loc[i, 'dia_semana'] >= 5:
            score += 1
            
        # Mayor riesgo en ciertas zonas (simulamos zonas más al sur)
        if df.loc[i, 'latitud'] < -13.4:
            score += 1
            
        # Mayor riesgo según tipo de delito
        if df.loc[i, 'tipo_delito'] in [0, 1]:  # robo o asalto
            score += 1
            
        # Clasificar en niveles
        if score >= 4:
            riesgo[i] = 2  # Alto
        elif score >= 2:
            riesgo[i] = 1  # Medio
        else:
            riesgo[i] = 0  # Bajo
    
    df['nivel_riesgo'] = riesgo.astype(int)
    
    return df

def train_model():
    """Entrena el modelo Random Forest"""
    print("Generando datos aleatorios...")
    df = generate_random_data(n_samples=1000)
    
    # Separar características y objetivo
    X = df[['latitud', 'longitud', 'hora', 'dia_semana', 'mes', 'tipo_delito']]
    y = df['nivel_riesgo']
    
    # Dividir en entrenamiento y prueba
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Entrenar modelo Random Forest
    print("Entrenando modelo Random Forest...")
    model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    model.fit(X_train, y_train)
    
    # Calcular precisión
    accuracy = model.score(X_test, y_test)
    print(f"Precisión del modelo: {accuracy:.2%}")
    
    # Guardar modelo
    with open('model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    print("Modelo guardado en model.pkl")
    
    return model, accuracy

def predict(input_data):
    """Hace una predicción con el modelo entrenado"""
    try:
        # Cargar modelo
        with open('model.pkl', 'rb') as f:
            model = pickle.load(f)
        
        # Convertir input a DataFrame
        df_input = pd.DataFrame([input_data])
        
        # Hacer predicción
        prediction = model.predict(df_input)[0]
        probabilities = model.predict_proba(df_input)[0]
        
        niveles = ['Bajo', 'Medio', 'Alto']
        
        return {
            'nivel_riesgo': int(prediction),
            'nivel_riesgo_texto': niveles[int(prediction)],
            'probabilidades': {
                'bajo': float(probabilities[0]),
                'medio': float(probabilities[1]),
                'alto': float(probabilities[2])
            }
        }
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'train':
        train_model()
    elif len(sys.argv) > 1 and sys.argv[1] == 'predict':
        # Leer datos de entrada desde stdin
        try:
            input_json = sys.stdin.read()
            if not input_json:
                print(json.dumps({'error': 'No se recibieron datos de entrada'}))
                sys.exit(1)
            input_data = json.loads(input_json)
            result = predict(input_data)
            print(json.dumps(result))
        except json.JSONDecodeError as e:
            print(json.dumps({'error': f'Error al parsear JSON: {str(e)}'}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({'error': f'Error en la predicción: {str(e)}'}))
            sys.exit(1)
    else:
        print("Uso: python train_model.py [train|predict]")

