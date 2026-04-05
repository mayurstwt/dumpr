import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  maxOpacity?: number;
}

const colorToRgbaPrefix = (color: string) => {
  if (typeof window === 'undefined') {
    return 'rgba(0, 0, 0,';
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext('2d');
  if (!context) {
    return 'rgba(0, 0, 0,';
  }

  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);

  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue},`;
};

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = 'rgb(255, 190, 55)',
  width,
  height,
  className,
  maxOpacity = 0.22,
  ...props
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const gridRef = useRef<{
    cols: number;
    rows: number;
    dpr: number;
    squares: Float32Array;
  } | null>(null);
  const colorRef = useRef(colorToRgbaPrefix(color));
  const [canvasSize, setCanvasSize] = useState({ width: width ?? 0, height: height ?? 0 });

  useEffect(() => {
    colorRef.current = colorToRgbaPrefix(color);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !container || !context) {
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let isVisible = true;
    let lastTime = 0;

    const cancelFrame = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const setupCanvas = () => {
      const nextWidth = width ?? container.clientWidth;
      const nextHeight = height ?? container.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = nextWidth * dpr;
      canvas.height = nextHeight * dpr;
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;

      const cols = Math.ceil(nextWidth / (squareSize + gridGap));
      const rows = Math.ceil(nextHeight / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);

      for (let index = 0; index < squares.length; index += 1) {
        squares[index] = Math.random() * maxOpacity;
      }

      gridRef.current = { cols, rows, dpr, squares };
      setCanvasSize({ width: nextWidth, height: nextHeight });
    };

    const draw = () => {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      for (let col = 0; col < grid.cols; col += 1) {
        for (let row = 0; row < grid.rows; row += 1) {
          const opacity = grid.squares[col * grid.rows + row];
          context.fillStyle = `${colorRef.current}${opacity})`;
          context.fillRect(
            col * (squareSize + gridGap) * grid.dpr,
            row * (squareSize + gridGap) * grid.dpr,
            squareSize * grid.dpr,
            squareSize * grid.dpr,
          );
        }
      }
    };

    const animate = (time: number) => {
      if (!isVisible || !gridRef.current) {
        frameRef.current = null;
        return;
      }

      const delta = lastTime === 0 ? 0.016 : (time - lastTime) / 1000;
      lastTime = time;

      for (let index = 0; index < gridRef.current.squares.length; index += 1) {
        if (Math.random() < flickerChance * delta) {
          gridRef.current.squares[index] = Math.random() * maxOpacity;
        }
      }

      draw();
      frameRef.current = requestAnimationFrame(animate);
    };

    const start = () => {
      if (frameRef.current === null) {
        lastTime = 0;
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    setupCanvas();
    draw();

    resizeObserver = new ResizeObserver(() => {
      setupCanvas();
      draw();
      if (isVisible) {
        start();
      }
    });
    resizeObserver.observe(container);

    intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? false;

      if (isVisible) {
        start();
        return;
      }

      cancelFrame();
    });
    intersectionObserver.observe(container);

    start();

    return () => {
      cancelFrame();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [flickerChance, gridGap, height, maxOpacity, squareSize, width]);

  return (
    <div
      ref={containerRef}
      className={cn('h-full w-full', className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none block h-full w-full"
        style={canvasSize}
      />
    </div>
  );
}
