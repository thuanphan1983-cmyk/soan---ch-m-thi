'use client';

import React, { useMemo } from 'react';

interface VariationTableData {
  x_nodes: string[];
  y_prime_signs: string[];
  y_values?: string[];
  undefined_at?: string[];
  func_label?: string;
  derivative_label?: string;
}

interface VariationTableSVGProps {
  data: VariationTableData;
  width?: number;
  id?: string;
}

function formatMathText(text: string): string {
  return text
    .replace(/\\infty/g, '∞')
    .replace(/\+∞/g, '+∞')
    .replace(/-∞/g, '-∞')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\\\/g, '');
}

export default function VariationTableSVG({ data, width = 600, id }: VariationTableSVGProps) {
  const {
    x_nodes,
    y_prime_signs,
    y_values,
    undefined_at = [],
    func_label = 'y',
    derivative_label = "y'",
  } = data;

  const config = useMemo(() => {
    const headerColWidth = 50;
    const paddingLeft = 30;
    const paddingRight = 30;
    const paddingTop = 10;
    const rowHeight = 48;
    const hasYRow = y_values && y_values.length > 0;
    const numRows = hasYRow ? 3 : 2;
    const totalHeight = paddingTop + numRows * rowHeight + 10;
    const dataAreaWidth = width - headerColWidth - paddingLeft - paddingRight;
    const dataAreaLeft = paddingLeft + headerColWidth;
    
    // Calculate x positions for each node (evenly spaced in data area)
    const nodeSpacing = dataAreaWidth / (x_nodes.length + 1);
    const nodeXPositions = x_nodes.map((_, i) => dataAreaLeft + nodeSpacing * (i + 1));

    // Row y centers
    const xRowY = paddingTop + rowHeight * 0.5;
    const yPrimeRowY = paddingTop + rowHeight * 1.5;
    const yRowY = hasYRow ? paddingTop + rowHeight * 2.5 : 0;

    // Row boundaries
    const topLineY = paddingTop;
    const line1Y = paddingTop + rowHeight;      // between x and y'
    const line2Y = paddingTop + rowHeight * 2;   // between y' and y
    const bottomLineY = paddingTop + numRows * rowHeight;

    return {
      headerColWidth, paddingLeft, paddingRight, paddingTop,
      rowHeight, hasYRow, numRows, totalHeight,
      dataAreaWidth, dataAreaLeft, nodeSpacing, nodeXPositions,
      xRowY, yPrimeRowY, yRowY,
      topLineY, line1Y, line2Y, bottomLineY, width,
    };
  }, [data, width, x_nodes, y_values]);

  const undefinedSet = new Set(undefined_at);

  // Determine arrow directions for y row
  const arrowSegments = useMemo(() => {
    if (!config.hasYRow || !y_values) return [];
    
    const segments: Array<{
      x1: number; y1: number; x2: number; y2: number;
      goingUp: boolean;
    }> = [];

    const yRowTop = config.line2Y + 8;
    const yRowBottom = config.bottomLineY - 8;
    const yRowMid = (yRowTop + yRowBottom) / 2;

    let signIdx = 0;
    for (let i = 0; i < x_nodes.length - 1; i++) {
      // Find the y' sign for this interval
      // Signs array: [sign_before_node0, sign_at_node0, sign_between_0_1, sign_at_node1, ...]
      // Actually the pattern is: sign in interval 0, value at node 1, sign in interval 1, ...
      // For standard variation tables, y_prime_signs has this pattern:
      // [sign_interval_0, value_at_node_1, sign_interval_1, value_at_node_2, ...]
      // But we receive it as a flat array where:
      // Index 0: sign before first x_node or in first interval
      // We need to figure out the sign in the interval between x_nodes[i] and x_nodes[i+1]
      
      // Simple approach: signs alternate between interval signs and node values
      // For n nodes, we have (n-1) intervals and (n-2) interior nodes
      // Total signs = (n-1) intervals + (n-2) interior node values = 2n-3
      // But conventionally: [interval_0, node_1_value, interval_1, node_2_value, ..., interval_{n-2}]
      // So interval signs are at even indices: 0, 2, 4, ...
      
      const intervalSignIdx = i * 2;
      const sign = intervalSignIdx < y_prime_signs.length ? y_prime_signs[intervalSignIdx] : '+';
      const goingUp = sign === '+';
      
      const x1 = config.nodeXPositions[i] + 10;
      const x2 = config.nodeXPositions[i + 1] - 10;
      
      const y1 = goingUp ? yRowBottom : yRowTop;
      const y2 = goingUp ? yRowTop : yRowBottom;

      segments.push({ x1, y1, x2, y2, goingUp });
    }

    return segments;
  }, [config, x_nodes, y_prime_signs, y_values]);

  return (
    <svg
      id={id}
      width={config.width}
      height={config.totalHeight}
      viewBox={`0 0 ${config.width} ${config.totalHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: '"Times New Roman", Times, serif', backgroundColor: 'white' }}
    >
      {/* Arrowhead marker definition */}
      <defs>
        <marker
          id={`arrowhead-${id || 'default'}`}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#1a1a1a" />
        </marker>
      </defs>

      {/* === BORDER LINES === */}
      {/* Top line */}
      <line x1={config.paddingLeft} y1={config.topLineY} x2={config.width - config.paddingRight} y2={config.topLineY} stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Line between x and y' rows */}
      <line x1={config.paddingLeft} y1={config.line1Y} x2={config.width - config.paddingRight} y2={config.line1Y} stroke="#1a1a1a" strokeWidth="1" />
      {/* Line between y' and y rows (if y row exists) */}
      {config.hasYRow && (
        <line x1={config.paddingLeft} y1={config.line2Y} x2={config.width - config.paddingRight} y2={config.line2Y} stroke="#1a1a1a" strokeWidth="1" />
      )}
      {/* Bottom line */}
      <line x1={config.paddingLeft} y1={config.bottomLineY} x2={config.width - config.paddingRight} y2={config.bottomLineY} stroke="#1a1a1a" strokeWidth="1.5" />
      
      {/* Left border */}
      <line x1={config.paddingLeft} y1={config.topLineY} x2={config.paddingLeft} y2={config.bottomLineY} stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Right border */}
      <line x1={config.width - config.paddingRight} y1={config.topLineY} x2={config.width - config.paddingRight} y2={config.bottomLineY} stroke="#1a1a1a" strokeWidth="1.5" />

      {/* === SINGLE VERTICAL SEPARATOR (header | data) === */}
      <line
        x1={config.dataAreaLeft}
        y1={config.topLineY}
        x2={config.dataAreaLeft}
        y2={config.bottomLineY}
        stroke="#1a1a1a"
        strokeWidth="1"
      />

      {/* === ROW HEADERS === */}
      <text x={config.paddingLeft + config.headerColWidth / 2} y={config.xRowY + 5} textAnchor="middle" fontSize="16" fontStyle="italic" fill="#1a1a1a">
        x
      </text>
      <text x={config.paddingLeft + config.headerColWidth / 2} y={config.yPrimeRowY + 5} textAnchor="middle" fontSize="16" fontStyle="italic" fill="#1a1a1a">
        {formatMathText(derivative_label)}
      </text>
      {config.hasYRow && (
        <text x={config.paddingLeft + config.headerColWidth / 2} y={config.yRowY + 5} textAnchor="middle" fontSize="16" fontStyle="italic" fill="#1a1a1a">
          {formatMathText(func_label)}
        </text>
      )}

      {/* === X ROW: Node values === */}
      {x_nodes.map((node, i) => (
        <text
          key={`x-${i}`}
          x={config.nodeXPositions[i]}
          y={config.xRowY + 5}
          textAnchor="middle"
          fontSize="14"
          fontStyle="italic"
          fill="#1a1a1a"
        >
          {formatMathText(node)}
        </text>
      ))}

      {/* === Y' ROW: Signs and zeros === */}
      {y_prime_signs.map((sign, i) => {
        // Determine position: even indices = intervals, odd indices = at nodes
        const isNodeValue = i % 2 === 1;
        const nodeIndex = isNodeValue ? Math.floor(i / 2) + 1 : -1;

        if (isNodeValue && nodeIndex >= 0 && nodeIndex < x_nodes.length) {
          // This is at a node position (0, ||, etc.)
          const isUndefined = undefinedSet.has(x_nodes[nodeIndex]) || sign === '||';
          return (
            <text
              key={`yp-${i}`}
              x={config.nodeXPositions[nodeIndex]}
              y={config.yPrimeRowY + 5}
              textAnchor="middle"
              fontSize="15"
              fontWeight={isUndefined ? 'bold' : 'normal'}
              fill={isUndefined ? '#c00' : '#1a1a1a'}
            >
              {isUndefined ? '||' : sign}
            </text>
          );
        } else if (!isNodeValue) {
          // This is in an interval
          const intervalIndex = i / 2;
          if (intervalIndex < x_nodes.length - 1) {
            const midX = (config.nodeXPositions[intervalIndex] + config.nodeXPositions[intervalIndex + 1]) / 2;
            return (
              <text
                key={`yp-${i}`}
                x={midX}
                y={config.yPrimeRowY + 5}
                textAnchor="middle"
                fontSize="16"
                fontWeight="bold"
                fill={sign === '+' ? '#0066cc' : '#cc0000'}
              >
                {sign}
              </text>
            );
          }
        }
        return null;
      })}

      {/* === Y ROW: Values and arrows === */}
      {config.hasYRow && y_values && (
        <>
          {/* Arrow segments */}
          {arrowSegments.map((seg, i) => (
            <line
              key={`arrow-${i}`}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke="#1a1a1a"
              strokeWidth="1.2"
              markerEnd={`url(#arrowhead-${id || 'default'})`}
            />
          ))}

          {/* Y values at nodes */}
          {y_values.map((val, i) => {
            if (!val && val !== '0') return null;
            
            const yRowTop = config.line2Y + 14;
            const yRowBottom = config.bottomLineY - 8;
            
            // Determine vertical position based on local extremum
            // First and last are at ±∞ positions
            // Interior points: if y' changes from + to -, it's a max (top position)
            // If y' changes from - to +, it's a min (bottom position)
            let yPos: number;
            
            if (i === 0 || i === y_values.length - 1) {
              // Boundary values: position based on the adjacent sign
              const adjacentSignIdx = i === 0 ? 0 : y_prime_signs.length - 1;
              const adjacentSign = y_prime_signs[adjacentSignIdx];
              if (i === 0) {
                yPos = adjacentSign === '+' ? yRowBottom : yRowTop;
              } else {
                yPos = adjacentSign === '+' ? yRowTop : yRowBottom;
              }
            } else {
              // Interior nodes: check sign change
              const signBefore = i > 0 ? y_prime_signs[(i - 1) * 2] : '+';
              const signAfter = i < y_values.length - 1 ? y_prime_signs[i * 2] : '+';
              if (signBefore === '+' && signAfter === '-') {
                yPos = yRowTop; // Local maximum
              } else if (signBefore === '-' && signAfter === '+') {
                yPos = yRowBottom; // Local minimum
              } else {
                yPos = (yRowTop + yRowBottom) / 2;
              }
            }

            return (
              <text
                key={`y-${i}`}
                x={config.nodeXPositions[i]}
                y={yPos}
                textAnchor="middle"
                fontSize="13"
                fontStyle="italic"
                fill="#1a1a1a"
              >
                {formatMathText(val)}
              </text>
            );
          })}
        </>
      )}
    </svg>
  );
}
