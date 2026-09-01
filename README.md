             BELT-SENTINEL
                   │
                   ▼
        ┌─────────────────────┐
        │   Conveyor Belt     │
        └──────────┬──────────┘
                   │
       ┌───────────┼────────────┐
       │           │            │
       ▼           ▼            ▼
 MPU6050       MLX90614       ACS712
 Vibration     Thermal        Current
       │           │            │
       └───────────┼────────────┘
                   │
                   ▼
              ESP32 / Edge
                   │
              ESP32-CAM
                   │
                   ▼
          Multimodal Analysis
                   │
        ┌──────────┼───────────┐
        ▼          ▼           ▼
      Health    Anomaly     Confidence
        │          │           │
        └──────────┼───────────┘
                   ▼
              Risk Engine
                   │
        ┌──────────┼─────────┐
        ▼          ▼         ▼
     NORMAL     WARNING    CRITICAL
                   │
                   ▼
             FastAPI Backend
                   │
          ┌────────┴────────┐
          ▼                 ▼
      Supabase             LLM
     Historical         Recommendation
          │                 │
          └────────┬────────┘
                   ▼
             React Dashboard
                   │
                   ▼
              Operator
