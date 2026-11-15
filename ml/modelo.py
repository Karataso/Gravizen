"""Motor de evaluación de Vitalis (rol 5).

Reglas explicables (mediana + MAD) sobre el dataset, Isolation Forest para
convergencia y proyección con Huber. `evaluate(crew_id, day)` devuelve la forma
de `docs/api.md`.

Limitación conocida: el dataset cubre 30 días por tripulante; para un día fuera
de ese rango `evaluate()` devuelve None y el backend cae al puente mock.
"""
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.linear_model import HuberRegressor
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = BASE_DIR / "dataset_salud_espacial_50_astronautas.csv"
MODEL_PATH = BASE_DIR / "models" / "isolation_forest_crew.joblib"

FEATURES = ['sleep', 'pulse', 'stress', 'spo2', 'stroke_volume', 'fatigue']
LEVEL_RANK = {'normal': 0, 'watch': 1, 'act': 2, 'emergency': 3}

# El CSV etiqueta en español; el contrato usa cuatro niveles.
LABELS = {'normal': 0, 'precaucion': 1, 'precaución': 1, 'alto riesgo': 1}

# Los ids del backend (c1..c4) se mapean a los del dataset.
CREW_ALIASES = {'c1': 'ASTRO_01', 'c2': 'ASTRO_02', 'c3': 'ASTRO_03', 'c4': 'ASTRO_04'}


# 1. CARGADOR Y NORMALIZACION
def _read_dataset(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path, dtype={'id_astronauta': str})
    df.columns = [col.strip().lower() for col in df.columns]

    column_mapping = {
        'id_astronauta': 'crew_id',
        'dia_mision': 'day',
        'horas_sueno': 'sleep',
        'frecuencia_cardiaca_reposo_bpm': 'pulse',
        'nivel_estres_1_10': 'stress',
        'spo2_porcentaje': 'spo2',
        'volumen_sistolico_ml': 'stroke_volume',
        'score_fatiga_cognitiva': 'fatigue',
        'etiqueta_riesgo': 'actual_anomaly',
    }
    df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})

    # Ids como texto: si se pasan a numero, "ASTRO_01" se vuelve 0 y colapsa todo.
    if 'crew_id' in df.columns:
        df['crew_id'] = df['crew_id'].astype(str).str.strip().str.upper()
    if 'day' in df.columns:
        df['day'] = pd.to_numeric(df['day'], errors='coerce').astype('Int64')
    for col in ['sleep', 'pulse', 'stress', 'spo2', 'stroke_volume', 'fatigue']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    if 'actual_anomaly' in df.columns:
        df['actual_anomaly'] = df['actual_anomaly'].map(_parse_label).astype(int)

    return df


def _parse_label(value) -> int:
    text = str(value).strip().lower()
    if text in LABELS:
        return LABELS[text]
    try:
        return int(float(text))
    except ValueError:
        return 0


def load_and_normalize_dataset(csv_path=None) -> pd.DataFrame:
    path = Path(csv_path) if csv_path else DEFAULT_DATASET
    if not path.exists():
        raise FileNotFoundError(f"No se encontro el dataset '{path}'.")
    # Copia para que cada llamada pueda filtrar sin tocar la cache.
    return _read_dataset(str(path)).copy()


# 2. MOTOR DE REGLAS (Mediana, MAD y absolutos)
def calculate_mad(series) -> tuple[float, float]:
    median = float(np.median(series))
    mad = float(np.median(np.abs(series - median)))
    return median, mad if mad > 0 else 1e-6


def evaluate_rules(df_person) -> pd.DataFrame:
    results = []
    if df_person.empty:
        return pd.DataFrame()

    sleep_med, sleep_mad = calculate_mad(df_person['sleep'])
    pulse_med, pulse_mad = calculate_mad(df_person['pulse'])
    fatigue_med, fatigue_mad = calculate_mad(df_person['fatigue'])

    for _, row in df_person.iterrows():
        level = 'normal'
        action = 'Ninguna. Operacion estandar.'
        urgency = 'Baja'

        if row.get('spo2', 95.0) < 92.0:
            level = 'emergency'
            action = 'Suministro de oxigeno de emergencia y revision medica inmediata.'
            urgency = 'Critica'
        elif row.get('stress', 0) >= 9.0:
            level = 'act'
            action = 'Protocolo de intervencion psicologica urgente.'
            urgency = 'Alta'
        elif abs(row['sleep'] - sleep_med) > 3 * sleep_mad:
            level = 'act'
            action = 'Ajustar horario de descanso del tripulante.'
            urgency = 'Media'
        elif (row['pulse'] - pulse_med) > 3 * pulse_mad:
            level = 'watch'
            action = 'Monitorear ritmo cardiaco en reposo.'
            urgency = 'Baja'
        elif (row['fatigue'] - fatigue_med) > 2.5 * fatigue_mad:
            level = 'watch'
            action = 'Reducir carga de tareas complejas.'
            urgency = 'Baja'

        results.append({
            'crew_id': row['crew_id'],
            'day': int(row['day']),
            'level': level,
            'reason': _rule_reason(row, sleep_med, sleep_mad, pulse_med, pulse_mad,
                                   fatigue_med, fatigue_mad),
            'action': action,
            'urgency': urgency,
            'rule_flag': 0 if level == 'normal' else 1,
        })

    return pd.DataFrame(results)


def _rule_reason(row, sleep_med, sleep_mad, pulse_med, pulse_mad,
                 fatigue_med, fatigue_mad) -> str:
    if row.get('spo2', 95.0) < 92.0:
        return f"SpO2 critico ({row['spo2']:.1f}% < 92%)"
    if row.get('stress', 0) >= 9.0:
        return f"Nivel de estres extremo ({row['stress']})"
    if abs(row['sleep'] - sleep_med) > 3 * sleep_mad:
        return f"Sueno anomalo ({row['sleep']:.1f}h vs mediana {sleep_med:.1f}h)"
    if (row['pulse'] - pulse_med) > 3 * pulse_mad:
        return f"Pulso elevado ({row['pulse']:.1f} bpm)"
    if (row['fatigue'] - fatigue_med) > 2.5 * fatigue_mad:
        return f"Fatiga cognitiva elevada ({row['fatigue']:.1f})"
    return "Parametros normales"


# 3. ISOLATION FOREST Y PERSISTENCIA
def train_and_save_isolation_forest(df_train):
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_healthy = df_train[df_train['actual_anomaly'] == 0] if 'actual_anomaly' in df_train else df_train
    if df_healthy.empty:
        df_healthy = df_train

    model = IsolationForest(n_estimators=150, contamination=0.05, random_state=42)
    model.fit(df_healthy[FEATURES].values)
    joblib.dump(model, MODEL_PATH)
    return model


def load_isolation_forest(df_fallback=None):
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    if df_fallback is None:
        df_fallback = load_and_normalize_dataset()
    return train_and_save_isolation_forest(df_fallback)


def score_with_isolation_forest(df_data, model=None):
    """Puntúa solo las filas recibidas: no hay fuga de días futuros."""
    if model is None:
        model = load_isolation_forest()
    X = df_data[FEATURES].astype(float).values
    preds = model.predict(X)
    return (preds == -1).astype(int), model.decision_function(X)


# 4. PROYECCION TEMPORAL
def project_days_to_threshold(df_person, indicator='stress', threshold=9.0) -> int | None:
    recent = df_person.tail(10)
    if len(recent) < 3:
        return None

    X = recent['day'].astype(float).values.reshape(-1, 1)
    y = recent[indicator].astype(float).values

    try:
        model = HuberRegressor().fit(X, y)
        slope = float(model.coef_[0])
        if abs(slope) < 1e-4:
            return None
        return max(0, int(np.ceil((threshold - y[-1]) / slope)))
    except Exception:
        return None


# 5. CONTRATO: evaluate(crew_id, day)
def resolve_crew_id(crew_id) -> str:
    key = str(crew_id).strip().lower()
    if key in CREW_ALIASES:
        return CREW_ALIASES[key]
    if key.isdigit():
        return f"ASTRO_{int(key):02d}"
    return str(crew_id).strip().upper()


def _level_from_z(value: float, median: float, mad: float, act_z=3.0, watch_z=2.0) -> str:
    z = abs(value - median) / mad
    if z >= act_z:
        return 'act'
    if z >= watch_z:
        return 'watch'
    return 'normal'


def _indicator(ind_id, value, median, mad, level, label, action, unit=''):
    if level == 'normal':
        why, escalate = [], None
    else:
        why = [f"{label}: {value:g}{unit} contra {median:g}{unit} de tu linea base"]
        escalate = 'flight_surgeon' if level in ('act', 'emergency') else 'crew'
    return {
        'id': ind_id,
        'value': round(float(value), 2),
        'baseline': round(float(median), 2),
        'level': level,
        'z': round((value - median) / mad, 2),
        'why': why,
        'action': action if level != 'normal' else None,
        'escalate': escalate,
        'days_to_threshold': None,
    }


def _worst(levels) -> str:
    return max(levels, key=lambda level: LEVEL_RANK[level])


def _hazard(hid, level, why=None):
    return {
        'id': hid,
        'level': level,
        'anomaly': None,
        'why': why or [],
        'days_to_threshold': None,
    }


def evaluate(crew_id, day, csv_path=None):
    """
    Evalúa a un tripulante en un día y devuelve la forma de `docs/api.md`.
    Devuelve None si el día cae fuera del rango del dataset (el backend cae al mock).
    """
    df = load_and_normalize_dataset(csv_path)
    crew = resolve_crew_id(crew_id)
    person = df[df['crew_id'] == crew].sort_values('day')
    if person.empty:
        return None

    day = int(day)
    if day < int(person['day'].min()) or day > int(person['day'].max()):
        return None

    window = person[person['day'] <= day]
    sleep_med, sleep_mad = calculate_mad(window['sleep'])
    pulse_med, pulse_mad = calculate_mad(window['pulse'])
    stress_med, stress_mad = calculate_mad(window['stress'])
    spo2_med, spo2_mad = calculate_mad(window['spo2'])

    row = window.iloc[-1]
    if_flags, _ = score_with_isolation_forest(window)
    if_flag = int(if_flags[-1])

    sleep_level = _level_from_z(row['sleep'], sleep_med, sleep_mad)
    pulse_level = _level_from_z(row['pulse'], pulse_med, pulse_mad)
    if row['pulse'] > pulse_med + 3 * pulse_mad:
        pulse_level = 'watch'
    stress_level = 'act' if row['stress'] >= 9 else 'watch' if row['stress'] >= 7 else 'normal'

    spo2_level = 'emergency' if row['spo2'] < 92 else 'act' if row['spo2'] < 94 else 'normal'
    if if_flag:
        stress_level = _worst([stress_level, 'watch'])

    stress_api = row['stress'] / 2  # el dataset usa 1-10; el contrato 1-5
    stress_med_api = stress_med / 2
    stress_mad_api = stress_mad / 2
    indicators = [
        _indicator('sleep_h', row['sleep'], sleep_med, sleep_mad, sleep_level, 'Sueno',
                   'Ajusta el horario de luz y descanso; sin cafeina tarde.', ' h'),
        _indicator('hr_rest', row['pulse'], pulse_med, pulse_mad, pulse_level, 'Pulso en reposo',
                   'Confirma la medicion y revisa hidratacion y sueño.', ' lpm'),
        _indicator('stress', stress_api, stress_med_api, stress_mad_api, stress_level, 'Estres',
                   'Reduce carga, pausas de respiracion y contacto con la tripulacion.', '/5'),
        _indicator('spo2', row['spo2'], spo2_med, spo2_mad, spo2_level, 'SpO2',
                   'Verifica sensor y calidad del aire; avisa al medico de vuelo.', '%'),
    ]

    level = _worst([ind['level'] for ind in indicators])
    reasons = [ind['why'][0] for ind in indicators if ind['why']]
    projection = project_days_to_threshold(window, 'stress', threshold=9.0)
    for ind in indicators:
        if ind['id'] == 'stress':
            ind['days_to_threshold'] = projection

    hazards = [
        _hazard('rad', 'normal', ['Sin dosimetro de radiacion en este dataset']),
        _hazard('iso', _worst([sleep_level, stress_level]), reasons[:2]),
        _hazard('grav', pulse_level, [indicators[1]['why'][0]] if indicators[1]['why'] else []),
        _hazard('env', spo2_level, [indicators[3]['why'][0]] if indicators[3]['why'] else []),
        _hazard('dist', 'normal', ['Contexto de enlace, sin fisiologia asociada']),
    ]

    return {
        'crew_id': str(crew_id),
        'day': day,
        'indicators': indicators,
        'hazards': hazards,
        'level': level,
        'isolation_forest_score': float(1.0 if if_flag else 0.0),
    }


# 6. EVALUACION AGREGADA
def evaluate_system_from_csv(csv_path=None):
    df_eval = load_and_normalize_dataset(csv_path)
    y_true, y_pred = [], []

    model = load_isolation_forest(df_eval)

    for _, df_person in df_eval.groupby('crew_id'):
        df_person = df_person.sort_values('day')
        if_flags, _ = score_with_isolation_forest(df_person, model)
        rule_flags = evaluate_rules(df_person)['rule_flag'].values
        combined = np.where((rule_flags == 1) | (if_flags == 1), 1, 0)

        y_true.extend(df_person['actual_anomaly'].astype(int).values)
        y_pred.extend(combined)

    y_true = np.array(y_true, dtype=int)
    y_pred = np.array(y_pred, dtype=int)

    return {
        'confusion_matrix': confusion_matrix(y_true, y_pred),
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, zero_division=0),
        'recall': recall_score(y_true, y_pred, zero_division=0),
        'f1_score': f1_score(y_true, y_pred, zero_division=0),
    }, df_eval


def plot_evaluation_results(metrics, df_eval):
    # matplotlib/seaborn solo para el informe: el backend no los necesita.
    import matplotlib.pyplot as plt
    import seaborn as sns

    output = BASE_DIR / 'docs' / 'evaluation_plots.png'
    output.parent.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    sns.heatmap(metrics['confusion_matrix'], annot=True, fmt='d', cmap='Blues', ax=axes[0],
                xticklabels=['Normal', 'Anomalia'], yticklabels=['Normal', 'Anomalia'])
    axes[0].set_title(f"Matriz de Confusion\nAccuracy: {metrics['accuracy']:.2%}")
    axes[0].set_xlabel('Prediccion del Sistema')
    axes[0].set_ylabel('Valor Real')

    sample_crew = df_eval['crew_id'].iloc[0]
    df_sample = df_eval[df_eval['crew_id'] == sample_crew]
    axes[1].plot(df_sample['day'], df_sample['stress'], label='Nivel Estres (1-10)', color='darkorange', lw=2)
    axes[1].plot(df_sample['day'], df_sample['sleep'], label='Horas Sueno', color='dodgerblue', lw=2)
    axes[1].axhline(y=9.0, color='red', linestyle='--', label='Umbral Critico')
    axes[1].set_title(f'Evolucion Biometrica - Tripulante {sample_crew}')
    axes[1].set_xlabel('Dia de Mision')
    axes[1].set_ylabel('Valor')
    axes[1].legend()
    axes[1].grid(True)

    plt.tight_layout()
    plt.savefig(output)
    plt.close(fig)
    print(f'Grafica guardada en: {output}')


if __name__ == '__main__':
    print('--- 1. Cargando dataset y entrenando Isolation Forest ---')
    df = load_and_normalize_dataset()
    train_and_save_isolation_forest(df)

    print('\n--- 2. Evaluando sistema completo ---')
    metrics, df_eval = evaluate_system_from_csv()
    print('\n================ RESULTADOS DE LA EVALUACION ================')
    print(f"Accuracy:  {metrics['accuracy'] * 100:.2f}%")
    print(f"Precision: {metrics['precision'] * 100:.2f}%")
    print(f"Recall:    {metrics['recall'] * 100:.2f}%")
    print(f"F1-Score:  {metrics['f1_score'] * 100:.2f}%")
    print('Matriz de Confusion:\n', metrics['confusion_matrix'])

    print('\n--- 3. Generando grafica ---')
    plot_evaluation_results(metrics, df_eval)

    print('\n--- 4. Probando evaluate(crew_id, day) ---')
    result = evaluate('c1', 30)
    print(result)
