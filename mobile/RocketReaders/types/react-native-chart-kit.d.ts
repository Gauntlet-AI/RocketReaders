declare module 'react-native-chart-kit' {
  import React from 'react';
  import { ViewStyle } from 'react-native';

  export interface ChartConfig {
    backgroundColor?: string;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    color?: (opacity?: number) => string;
    labelColor?: (opacity?: number) => string;
    strokeWidth?: number;
    barPercentage?: number;
    useShadowColorFromDataset?: boolean;
    decimalPlaces?: number;
    style?: ViewStyle;
    propsForDots?: {
      r?: string;
      strokeWidth?: string;
      stroke?: string;
    };
  }

  export interface AbstractChartProps {
    width: number;
    height: number;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientFromOpacity?: number;
    backgroundGradientToOpacity?: number;
    chartConfig: ChartConfig;
    style?: ViewStyle;
    bezier?: boolean;
  }

  export interface LineChartData {
    labels: string[];
    datasets: {
      data: number[];
      color?: (opacity?: number) => string;
      strokeWidth?: number;
    }[];
    legend?: string[];
  }

  export interface LineChartProps extends AbstractChartProps {
    data: LineChartData;
    withDots?: boolean;
    withShadow?: boolean;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    withHorizontalLabels?: boolean;
    withVerticalLabels?: boolean;
    fromZero?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    yAxisInterval?: number;
    xAxisLabel?: string;
    decorator?: Function;
    onDataPointClick?: Function;
  }

  export class LineChart extends React.Component<LineChartProps> {}

  export interface BarChartData {
    labels: string[];
    datasets: {
      data: number[];
      colors?: string[];
      color?: (opacity?: number) => string;
    }[];
  }

  export interface BarChartProps extends AbstractChartProps {
    data: BarChartData;
    withHorizontalLabels?: boolean;
    withVerticalLabels?: boolean;
    withInnerLines?: boolean;
    withVerticalLines?: boolean;
    withHorizontalLines?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    showBarTops?: boolean;
    showValuesOnTopOfBars?: boolean;
    segments?: number;
  }

  export class BarChart extends React.Component<BarChartProps> {}

  export interface PieChartData {
    data: {
      name?: string;
      population?: number;
      color?: string;
      legendFontColor?: string;
      legendFontSize?: number;
    }[];
    accessor?: string;
    backgroundColor?: string;
    paddingLeft?: string;
    paddingRight?: string;
    absolute?: boolean;
    hasLegend?: boolean;
    width?: number;
    height?: number;
    chartConfig?: ChartConfig;
  }

  export interface PieChartProps {
    data: PieChartData;
    width: number;
    height: number;
    chartConfig?: ChartConfig;
    accessor?: string;
    backgroundColor?: string;
    paddingLeft?: string;
    paddingRight?: string;
    center?: number[];
    absolute?: boolean;
    hasLegend?: boolean;
    style?: ViewStyle;
  }

  export class PieChart extends React.Component<PieChartProps> {}
} 