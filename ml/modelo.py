import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import IsolationForest
from sklearn.linear_model import HuberRegressor
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score

# 1. CARGADOR Y NORMALIZAR DATOS
def load_and_normalize_dataset(csv_path="dataset_salud_espacial_50_astronautas.csv"):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"No se encontro el archivo '{csv_path}'. Verifica que este en la misma carpeta.")
    
    df = pd.read_csv(csv_path)
    print(f"-> Columnas originales leidas del CSV: {df.columns.tolist()}")
    
    # Mapeo exacto basado en la estructura de tu dataset
    column_mapping = {
        'id_astronauta': 'crew_id',
        'dia_mision': 'day',
        'horas_sueno': 'sleep',
        'frecuencia_cardiaca_reposo_bpm': 'pulse',
        'nivel_estres_1_10': 'stress',
        'spo2_porcentaje': 'spo2',
        'volumen_sistolico_ml': 'stroke_volume',
        'score_fatiga_cognitiva': 'fatigue',
        'etiqueta_riesgo': 'actual_anomaly'
    }
    
    # Normalizar nombres de columnas a minusculas y sin espacios
    df.columns = [col.strip().lower() for col in df.columns]
    df = df.rename(columns={col: column_mapping[col] for col in df.columns if col in column_mapping})
    
    # Convertir todas las caracteristicas clave a numericas estrictas (evita errores de tipo)
    features_to_convert = ['crew_id', 'day', 'sleep', 'pulse', 'stress', 'spo2', 'stroke_volume', 'fatigue']
    for col in features_to_convert:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Sanitizar la etiqueta real (actual_anomaly) para que sea estrictamente entero (0 o 1)
    if 'actual_anomaly' in df.columns:
        def sanitize_anomaly(val):
            if pd.isna(val):
                return 0
            if isinstance(val, (int, float, np.number)):
                return int(val)
            val_str = str(val).strip().lower()
            if val_str in ['1', 'true', 'yes', 'si', 'anomalia', 'riesgo', 'anomaly', 'danger']:
                return 1
            try:
                return int(float(val_str))
            except ValueError:
                return 0
                
        df['actual_anomaly'] = df['actual_anomaly'].apply(sanitize_anomaly).astype(int)
    
    print("-> Columnas adaptadas y sanitizadas correctamente.")
    return df

# Caracteristicas numericas que usara el modelo y las reglas
FEATURES = ['sleep', 'pulse', 'stress', 'spo2', 'stroke_volume', 'fatigue']

# 2. MOTOR DE REGLAS (Mediana, MAD y Absolutos)
def calculate_mad(series):
    median = np.median(series)
    mad = np.median(np.abs(series - median))
    return median, mad if mad > 0 else 1e-6

def evaluate_rules(df_person):
    results = []
    if df_person.empty:
        return pd.DataFrame()

    sleep_med, sleep_mad = calculate_mad(df_person['sleep'])
    pulse_med, pulse_mad = calculate_mad(df_person['pulse'])
    stress_med, stress_mad = calculate_mad(df_person['stress'])
    fatigue_med, fatigue_mad = calculate_mad(df_person['fatigue'])

    for idx, row in df_person.iterrows():
        level = "normal"
        reasons = []
        action = "Ninguna. Operacion estandar."
        urgency = "Baja"
        
        # Umbrales Absolutos o Criticos espaciales
        if row.get('spo2', 95.0) < 92.0:
            level = "emergencia"
            reasons.append(f"SpO2 critico ({row['spo2']:.1f}% < 92%)")
            action = "Suministro de oxigeno de emergencia y revision medica inmediata."
            urgency = "Critica"
        elif row.get('stress', 0) >= 9.0:
            level = "actuar"
            reasons.append(f"Nivel de estres extremo ({row['stress']})")
            action = "Protocolo de intervencion psicologica urgente."
            urgency = "Alta"
            
        # Umbrales Relativos (Mediana + MAD)
        elif abs(row['sleep'] - sleep_med) > 3 * sleep_mad:
            level = "actuar" if level != "emergencia" else level
            reasons.append(f"Sueno anomalo ({row['sleep']:.1f}h vs mediana {sleep_med:.1f}h)")
            action = "Ajustar horario de descanso del tripulante."
            urgency = "Media"
        elif (row['pulse'] - pulse_med) > 3 * pulse_mad:
            level = "vigilar" if level == "normal" else level
            reasons.append(f"Pulso elevado ({row['pulse']:.1f} bpm)")
            action = "Monitorear ritmo cardiaco en reposo."
            urgency = "Baja"
        elif (row['fatigue'] - fatigue_med) > 2.5 * fatigue_mad:
            level = "vigilar" if level == "normal" else level
            reasons.append(f"Fatiga cognitiva elevada ({row['fatigue']:.1f})")
            action = "Reducir carga de tareas complejas."
            urgency = "Baja"

        results.append({
            'crew_id': row['crew_id'],
            'day': row['day'],
            'level': level,
            'reason': "; ".join(reasons) if reasons else "Parametros normales",
            'action': action,
            'urgency': urgency,
            'rule_flag': 1 if level in ['vigilar', 'actuar', 'emergencia'] else 0
        })
        
    return pd.DataFrame(results)

# 3. ISOLATION FOREST & PERSISTENCIA (joblib)
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest_crew.joblib")

def train_and_save_isolation_forest(df_train):
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    if 'actual_anomaly' in df_train.columns:
        df_healthy = df_train[df_train['actual_anomaly'] == 0]
        if df_healthy.empty:
            df_healthy = df_train
    else:
        df_healthy = df_train
        
    X = df_healthy[FEATURES].values
    model = IsolationForest(n_estimators=150, contamination=0.05, random_state=42)
    model.fit(X)
    
    joblib.dump(model, MODEL_PATH)
    return model

def load_isolation_forest(df_fallback=None):
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    elif df_fallback is not None:
        return train_and_save_isolation_forest(df_fallback)
    return None

def score_with_isolation_forest(df_data):
    model = load_isolation_forest(df_data)
    X = df_data[FEATURES].values
    
    preds = model.predict(X)
    scores = model.decision_function(X)
    anomaly_flag = np.where(preds == -1, 1, 0)
    return anomaly_flag, scores

# 4. PROYECCION TEMPORAL (HuberRegressor)
def project_days_to_threshold(df_person, indicator='stress', threshold=9.0):
    recent_data = df_person.tail(10)
    if len(recent_data) < 3:
        return -1
        
    X = recent_data['day'].values.reshape(-1, 1)
    y = recent_data[indicator].values
    
    try:
        model = HuberRegressor()
        model.fit(X, y)
        slope = model.coef_[0]
        current_val = y[-1]
        
        if abs(slope) < 1e-4:
            return 999 
            
        days_to_reach = (threshold - current_val) / slope
        return max(0, int(np.ceil(days_to_reach)))
    except Exception:
        return -1

# 5. EVALUACION, METRICAS Y GRAFICAS
def evaluate_system_from_csv(csv_path="dataset_salud_espacial_50_astronautas.csv"):
    df_eval = load_and_normalize_dataset(csv_path)
    y_true, y_pred = [], []
    
    crew_groups = df_eval.groupby('crew_id')
    if_flags, _ = score_with_isolation_forest(df_eval)
    
    for crew_id, df_person in crew_groups:
        df_person = df_person.sort_values('day')
        res_rules = evaluate_rules(df_person)
        
        person_indices = df_eval['crew_id'] == crew_id
        df_person_if_flags = if_flags[person_indices]
        
        df_person['rule_flag'] = res_rules['rule_flag'].values
        df_person['if_flag'] = df_person_if_flags
        df_person['combined_pred'] = np.where((df_person['rule_flag'] == 1) | (df_person['if_flag'] == 1), 1, 0)
        
        if 'actual_anomaly' in df_person.columns:
            y_true.extend(df_person['actual_anomaly'].astype(int).values)
            y_pred.extend(df_person['combined_pred'].astype(int).values)
            
    if not y_true:
        print("Advertencia: No se encontro la columna 'actual_anomaly' en el dataset.")
        return None, df_eval

    # Forzar tipos enteros puros antes de pasar a scikit-learn
    y_true = np.array(y_true, dtype=int)
    y_pred = np.array(y_pred, dtype=int)

    cm = confusion_matrix(y_true, y_pred)
    metrics = {
        "confusion_matrix": cm,
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1_score": f1_score(y_true, y_pred, zero_division=0)
    }
    return metrics, df_eval

def evaluate(crew_id: int, day: int, csv_path="dataset_salud_espacial_50_astronautas.csv"):
    """
    Funcion requerida por el plan de trabajo: evalua a un tripulante en tiempo real.
    """
    df_full = load_and_normalize_dataset(csv_path)
    df_person = df_full[(df_full['crew_id'] == crew_id) & (df_full['day'] <= day)].sort_values('day')
    
    if df_person.empty:
        return {"status": "Error", "message": f"Tripulante {crew_id} o dia {day} no encontrado."}
        
    res_rules = evaluate_rules(df_person)
    latest_rule = res_rules.iloc[-1]
    
    _, if_scores = score_with_isolation_forest(df_full)
    person_mask = df_full['crew_id'] == crew_id
    latest_if_score = if_scores[person_mask][-1] if len(if_scores[person_mask]) > 0 else 0.0
    
    projection_days = project_days_to_threshold(df_person, 'stress', threshold=9.0)
    
    return {
        "crew_id": crew_id,
        "day": day,
        "level": latest_rule['level'],
        "reason": latest_rule['reason'],
        "action": latest_rule['action'],
        "urgency": latest_rule['urgency'],
        "isolation_forest_score": float(latest_if_score),
        "projected_days_to_critical_stress": projection_days
    }

def plot_evaluation_results(metrics, df_eval):
    os.makedirs("docs", exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # 1. Matriz de Confusion
    if metrics and "confusion_matrix" in metrics:
        sns.heatmap(metrics["confusion_matrix"], annot=True, fmt='d', cmap='Blues', ax=axes[0],
                    xticklabels=['Normal', 'Anomalia'], yticklabels=['Normal', 'Anomalia'])
        axes[0].set_title(f"Matriz de Confusion\nAccuracy: {metrics['accuracy']:.2%}")
        axes[0].set_xlabel("Prediccion del Sistema")
        axes[0].set_ylabel("Valor Real")
    
    # 2. Grafica de Indicadores (Ejemplo de un tripulante)
    sample_crew = df_eval['crew_id'].iloc[0]
    df_sample = df_eval[df_eval['crew_id'] == sample_crew]
    axes[1].plot(df_sample['day'], df_sample['stress'], label='Nivel Estres (1-10)', color='darkorange', lw=2)
    axes[1].plot(df_sample['day'], df_sample['sleep'], label='Horas Sueno', color='dodgerblue', lw=2)
    axes[1].axhline(y=9.0, color='red', linestyle='--', label='Umbral Critico')
    axes[1].set_title(f"Evolucion Biometrica - Tripulante {sample_crew}")
    axes[1].set_xlabel("Dia de Mision")
    axes[1].set_ylabel("Valor")
    axes[1].legend()
    axes[1].grid(True)
    
    plt.tight_layout()
    plt.savefig("docs/evaluation_plots.png")
    print("Grafica guardada exitosamente en: docs/evaluation_plots.png")
    plt.show()

# 6.  EJECUCION
if __name__ == "__main__":
    dataset_path = "dataset_salud_espacial_50_astronautas.csv"
    
    print("--- 1. Cargando dataset y entrenando Isolation Forest ---")
    df = load_and_normalize_dataset(dataset_path)
    train_and_save_isolation_forest(df)
    
    print("\n--- 2. Evaluando sistema completo ---")
    metrics, df_eval = evaluate_system_from_csv(dataset_path)
    
    if metrics:
        print("\n================ RESULTADOS DE LA EVALUACION ================")
        print(f"Accuracy:  {metrics['accuracy'] * 100:.2f}%")
        print(f"Precision: {metrics['precision'] * 100:.2f}%")
        print(f"Recall:    {metrics['recall'] * 100:.2f}%")
        print(f"F1-Score:  {metrics['f1_score'] * 100:.2f}%")
        print("Matriz de Confusion:\n", metrics['confusion_matrix'])
        print("=============================================================")
        
        print("\n--- 3. Generando grafica y guardando en docs/ ---")
        plot_evaluation_results(metrics, df_eval)
    
    print("\n--- 4. Probando la funcion evaluate(crew_id, day) ---")
    sample_crew_id = int(df['crew_id'].iloc[0])
    sample_day = int(df['day'].max())
    
    single_result = evaluate(crew_id=sample_crew_id, day=sample_day, csv_path=dataset_path)
    print(f"\nResultado en tiempo real para Tripulante {sample_crew_id} en el dia {sample_day}:")
    for k, v in single_result.items():
        print(f"  - {k}: {v}")