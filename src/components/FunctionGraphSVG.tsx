'use client';

import React, { useMemo } from 'react';

interface GraphPoint {
  x: number;
  y: number;
  label?: string;
}

interface Asymptote {
  type: 'vertical' | 'horizontal' | 'oblique';
  equation: string;
  value?: number;
  slope?: number;
  intercept?: number;
}

interface GraphData {
  func_expression: string;
  func_js: string;
  x_range: [number, number];
  y_range: [number, number];
  critical_points?: GraphPoint[];
  inflection_points?: GraphPoint[];
  intercepts?: GraphPoint[];
  asymptotes?: Asymptote[];
  discontinuities?: number[];
}

interface FunctionGraphSVGProps {
  data: GraphData;
  width?: number;
  height?: number;
  id?: string;
}

export default function FunctionGraphSVG({ data, width = 500, height = 400, id }: FunctionGraphSVGProps) {
  const {
    func_js,
    x_range,
    y_range,
    critical_points = [],
    inflection_points = [],
    intercepts = [],
    asymptotes = [],
    discontinuities = [],
  } = data;

  const padding = { top: 30, right: 30, bottom: 30, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Math coordinate to SVG coordinate conversion
  const toSvgX = (mathX: number) => {
    return padding.left + ((mathX - x_range[0]) / (x_range[1] - x_range[0])) * plotWidth;
  };
  const toSvgY = (mathY: number) => {
    return padding.top + ((y_range[1] - mathY) / (y_range[1] - y_range[0])) * plotHeight;
  };

  // Origin position
  const originX = toSvgX(0);
  const originY = toSvgY(0);

  // Evaluate the function
  const evalFunc = useMemo(() => {
    try {
      // Create a safe function evaluator
      const fn = new Function('x', `
        const abs = Math.abs;
        const sqrt = Math.sqrt;
        const pow = Math.pow;
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const log = Math.log;
        const exp = Math.exp;
        const PI = Math.PI;
        try {
          const result = ${func_js};
          if (!isFinite(result)) return null;
          return result;
        } catch(e) { return null; }
      `);
      return fn as (x: number) => number | null;
    } catch {
      return () => null;
    }
  }, [func_js]);

  // Generate curve points
  const curveSegments = useMemo(() => {
    const numSamples = 800;
    const dx = (x_range[1] - x_range[0]) / numSamples;
    const segments: Array<Array<{ sx: number; sy: number }>> = [];
    let currentSegment: Array<{ sx: number; sy: number }> = [];

    const epsilon = dx * 0.5;

    for (let i = 0; i <= numSamples; i++) {
      const x = x_range[0] + i * dx;

      // Check if near a discontinuity
      let nearDisc = discontinuities.some(d => Math.abs(x - d) < epsilon);
      // Check if near a vertical asymptote
      for (const asym of asymptotes) {
        if (asym.type === 'vertical' && asym.value !== undefined && Math.abs(x - asym.value) < epsilon * 2) {
          nearDisc = true;
          break;
        }
      }

      if (nearDisc) {
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [];
        continue;
      }

      const y = evalFunc(x);
      if (y === null || y < y_range[0] - 5 || y > y_range[1] + 5) {
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [];
        continue;
      }

      const clampedY = Math.max(y_range[0] - 2, Math.min(y_range[1] + 2, y));
      currentSegment.push({ sx: toSvgX(x), sy: toSvgY(clampedY) });
    }
    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }
    return segments;
  }, [evalFunc, x_range, y_range, discontinuities, asymptotes]);

  // Generate tick marks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = Math.ceil((x_range[1] - x_range[0]) / 10);
    for (let v = Math.ceil(x_range[0]); v <= Math.floor(x_range[1]); v += step) {
      if (v !== 0) ticks.push(v);
    }
    // Add integer ticks near origin
    for (let v = Math.ceil(x_range[0]); v <= Math.floor(x_range[1]); v++) {
      if (v !== 0 && !ticks.includes(v)) ticks.push(v);
    }
    return ticks.sort((a, b) => a - b);
  }, [x_range]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = Math.ceil(y_range[0]); v <= Math.floor(y_range[1]); v++) {
      if (v !== 0) ticks.push(v);
    }
    return ticks;
  }, [y_range]);

  return (
    <svg
      id={id}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: '"Times New Roman", Times, serif', backgroundColor: 'white' }}
    >
      <defs>
        <marker id={`axis-arrow-${id || 'g'}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#1a1a1a" />
        </marker>
      </defs>

      {/* === GRID (subtle) === */}
      {xTicks.map(v => (
        <line key={`gx-${v}`} x1={toSvgX(v)} y1={padding.top} x2={toSvgX(v)} y2={height - padding.bottom} stroke="#e5e7eb" strokeWidth="0.5" />
      ))}
      {yTicks.map(v => (
        <line key={`gy-${v}`} x1={padding.left} y1={toSvgY(v)} x2={width - padding.right} y2={toSvgY(v)} stroke="#e5e7eb" strokeWidth="0.5" />
      ))}

      {/* === AXES === */}
      {/* X axis */}
      <line
        x1={padding.left}
        y1={originY}
        x2={width - padding.right + 5}
        y2={originY}
        stroke="#1a1a1a"
        strokeWidth="1.5"
        markerEnd={`url(#axis-arrow-${id || 'g'})`}
      />
      {/* Y axis */}
      <line
        x1={originX}
        y1={height - padding.bottom}
        x2={originX}
        y2={padding.top - 5}
        stroke="#1a1a1a"
        strokeWidth="1.5"
        markerEnd={`url(#axis-arrow-${id || 'g'})`}
      />

      {/* Origin label */}
      <text x={originX - 12} y={originY + 16} fontSize="14" fontStyle="italic" fill="#1a1a1a">O</text>
      {/* Axis labels */}
      <text x={width - padding.right + 8} y={originY + 5} fontSize="14" fontStyle="italic" fill="#1a1a1a">x</text>
      <text x={originX + 8} y={padding.top - 8} fontSize="14" fontStyle="italic" fill="#1a1a1a">y</text>

      {/* Tick marks on X axis */}
      {xTicks.map(v => {
        const sx = toSvgX(v);
        return (
          <g key={`xt-${v}`}>
            <line x1={sx} y1={originY - 3} x2={sx} y2={originY + 3} stroke="#1a1a1a" strokeWidth="1" />
            <text x={sx} y={originY + 16} textAnchor="middle" fontSize="11" fill="#555">{v}</text>
          </g>
        );
      })}
      {/* Tick marks on Y axis */}
      {yTicks.map(v => {
        const sy = toSvgY(v);
        return (
          <g key={`yt-${v}`}>
            <line x1={originX - 3} y1={sy} x2={originX + 3} y2={sy} stroke="#1a1a1a" strokeWidth="1" />
            <text x={originX - 8} y={sy + 4} textAnchor="end" fontSize="11" fill="#555">{v}</text>
          </g>
        );
      })}

      {/* === ASYMPTOTES (dashed lines) === */}
      {asymptotes.map((asym, i) => {
        if (asym.type === 'vertical' && asym.value !== undefined) {
          const sx = toSvgX(asym.value);
          return (
            <g key={`asym-${i}`}>
              <line x1={sx} y1={padding.top} x2={sx} y2={height - padding.bottom} stroke="#e74c3c" strokeWidth="1" strokeDasharray="6,4" />
              <text x={sx + 4} y={padding.top + 14} fontSize="10" fill="#e74c3c">{asym.equation}</text>
            </g>
          );
        }
        if (asym.type === 'horizontal' && asym.value !== undefined) {
          const sy = toSvgY(asym.value);
          return (
            <g key={`asym-${i}`}>
              <line x1={padding.left} y1={sy} x2={width - padding.right} y2={sy} stroke="#e74c3c" strokeWidth="1" strokeDasharray="6,4" />
              <text x={width - padding.right - 4} y={sy - 4} textAnchor="end" fontSize="10" fill="#e74c3c">{asym.equation}</text>
            </g>
          );
        }
        if (asym.type === 'oblique' && asym.slope !== undefined && asym.intercept !== undefined) {
          const x1 = x_range[0];
          const x2 = x_range[1];
          const y1 = asym.slope * x1 + asym.intercept;
          const y2 = asym.slope * x2 + asym.intercept;
          return (
            <line key={`asym-${i}`} x1={toSvgX(x1)} y1={toSvgY(y1)} x2={toSvgX(x2)} y2={toSvgY(y2)} stroke="#e74c3c" strokeWidth="1" strokeDasharray="6,4" />
          );
        }
        return null;
      })}

      {/* === FUNCTION CURVE === */}
      {curveSegments.map((segment, i) => (
        <polyline
          key={`curve-${i}`}
          points={segment.map(p => `${p.sx},${p.sy}`).join(' ')}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* === CRITICAL POINTS === */}
      {critical_points.map((pt, i) => {
        const sx = toSvgX(pt.x);
        const sy = toSvgY(pt.y);
        return (
          <g key={`cp-${i}`}>
            {/* Dashed guidelines to axes */}
            <line x1={sx} y1={sy} x2={sx} y2={originY} stroke="#999" strokeWidth="0.8" strokeDasharray="4,3" />
            <line x1={sx} y1={sy} x2={originX} y2={sy} stroke="#999" strokeWidth="0.8" strokeDasharray="4,3" />
            {/* Point dot */}
            <circle cx={sx} cy={sy} r="3.5" fill="#2563eb" stroke="white" strokeWidth="1.5" />
            {/* Label */}
            {pt.label && (
              <text x={sx + 8} y={sy - 8} fontSize="12" fontStyle="italic" fill="#1a1a1a">{pt.label}</text>
            )}
          </g>
        );
      })}

      {/* === INTERCEPTS === */}
      {intercepts.map((pt, i) => {
        const sx = toSvgX(pt.x);
        const sy = toSvgY(pt.y);
        return (
          <g key={`int-${i}`}>
            <circle cx={sx} cy={sy} r="2.5" fill="#1a1a1a" />
            {pt.label && (
              <text x={sx + 6} y={sy - 6} fontSize="11" fontStyle="italic" fill="#1a1a1a">{pt.label}</text>
            )}
          </g>
        );
      })}

      {/* === INFLECTION POINTS === */}
      {inflection_points.map((pt, i) => {
        const sx = toSvgX(pt.x);
        const sy = toSvgY(pt.y);
        return (
          <g key={`inf-${i}`}>
            <circle cx={sx} cy={sy} r="2.5" fill="#16a34a" />
            {pt.label && (
              <text x={sx + 6} y={sy - 6} fontSize="11" fontStyle="italic" fill="#16a34a">{pt.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
