# **App Name**: Predictive Insight Dashboard

## Core Features:

- Machine Selection: Allows users to select from a list of machines (Laader, Looper, Mesa Elevadora, Puente Grua, T8) to view their operational data.
- Component Visualization: Displays the components associated with the selected machine, according to the hardcoded component map (e.g., Laader shows 'Motor Mixer').
- Date Range Filter: Implements a date range picker to filter data, with selectable range between days and months and a minimum selectable date of April 2025.
- Current Graph: Displays a line graph visualizing current (Amps) over time, including 'Corriente Maxima' (limit), 'Referencia Corriente Promedio Suavizado' (reference), and 'Corriente Promedio Suavizado' (real) data series.
- Unbalance Graph: Displays a line graph visualizing unbalance over time, including 'Umbral Desbalance' (limit), 'Referencia Desbalance Suavizado' (reference), and 'Desbalance Suavizado' (real) data series.
- Load Factor Graph: Displays a line graph visualizing load factor over time, including 'Umbral Factor Carga' (limit), 'Referencia Factor De Carga Suavizado' (reference), and 'Factor De Carga Suavizado' (real) data series.
- Simulated Data Generation: Generates mock sensor data in a predefined JSON structure using useMaintenanceData.ts, ensuring data includes machineId, componentId, timestamp, and metrics (current, unbalance, load_factor).

## Style Guidelines:

- Primary color: Deep blue (#0B3D91), reflecting reliability and precision of industrial monitoring.
- Background color: Light gray (#F0F4F8) for the main area, providing a clean backdrop to highlight the graphs. Sidebar background: Dark blue (#0155B8), as requested.
- Accent color: Electric blue (#3498DB) for interactive elements and highlights, providing clear affordances.
- Body and headline font: 'Inter', a sans-serif font for clear and modern readability.
- Lucide React icons used sparingly to support, not distract, from the main data visualizations.
- Minimalist sidebar on the left for machine selection; date range picker at the top for global filtering; line graphs displayed prominently in the main content area.
- Subtle transitions when switching between machines or adjusting the date range, providing smooth visual feedback.