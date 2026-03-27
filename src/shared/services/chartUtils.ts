/**
 * Chart.js Utilities
 * Create reusable charts for analytics and inventory insights
 */

export interface ChartConfig {
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    tension?: number;
  }[];
}

/**
 * Predefined chart colors (matching app theme)
 */
export const CHART_COLORS = {
  primary: '#4f8ef7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#e05050',
  blue: '#A7C7E7',
  green: '#B7E4C7',
  yellow: '#FFF3B0',
  orange: '#FFD6A5',
  pink: '#FFCAD4',
  purple: '#E0BBE4',
};

/**
 * Bar chart config template
 */
export function createBarChartConfig(
  title: string,
  labels: string[],
  data: number[],
  label: string
): ChartConfig {
  return {
    title,
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: CHART_COLORS.blue,
        borderColor: CHART_COLORS.primary,
        borderWidth: 1,
      },
    ],
  };
}

/**
 * Line chart config template
 */
export function createLineChartConfig(
  title: string,
  labels: string[],
  data: number[],
  label: string
): ChartConfig {
  return {
    title,
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.blue,
        tension: 0.3,
      },
    ],
  };
}

/**
 * Pie chart config template
 */
export function createPieChartConfig(
  title: string,
  labels: string[],
  data: number[]
): ChartConfig {
  const colors = [
    CHART_COLORS.blue,
    CHART_COLORS.green,
    CHART_COLORS.yellow,
    CHART_COLORS.orange,
    CHART_COLORS.pink,
    CHART_COLORS.purple,
  ];

  return {
    title,
    labels,
    datasets: [
      {
        label: title,
        data,
        backgroundColor: colors.reduce((acc, color, i) => {
          acc[i % colors.length] = color;
          return acc;
        }, {} as any),
      },
    ],
  };
}

/**
 * Doughnut chart config template
 */
export function createDoughnutChartConfig(
  title: string,
  labels: string[],
  data: number[]
): ChartConfig {
  return createPieChartConfig(title, labels, data);
}

/**
 * Multi-dataset chart config
 */
export function createMultiDatasetChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>
): ChartConfig {
  const chartDatasets = datasets.map((dataset, index) => {
    const colors = Object.values(CHART_COLORS);
    return {
      label: dataset.label,
      data: dataset.data,
      backgroundColor: colors[index % colors.length],
      borderColor: CHART_COLORS.primary,
      borderWidth: 1,
    };
  });

  return {
    title,
    labels,
    datasets: chartDatasets,
  };
}

/**
 * Get chart options with common settings
 */
export function getChartOptions(responsive: boolean = true) {
  return {
    responsive,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#e2e8f0',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };
}
