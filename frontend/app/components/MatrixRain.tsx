// components/MatrixRain.tsx

"use client";
import React, { useRef, useEffect, useState } from "react";

interface MatrixRainProps {
  fontSize?: number; // size of each character in px
  speed?: number; // milliseconds between frames
}

const MatrixRain: React.FC<MatrixRainProps> = ({
  fontSize = 16,
  speed = 100, // ← default to 100ms
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // 1) Measure parent size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateSize = () =>
      setSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // 2) Draw loop driven solely by setInterval(speed)
  useEffect(() => {
    const canvas = canvasRef.current;
    const { width, height } = size;
    if (!canvas || !width || !height) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size the canvas
    canvas.width = width;
    canvas.height = height;

    // Matrix characters
    const letters = "!@#$%^&*()_+-=[]{}|;:',.<>/?";
    const charArray = letters.split("");
    const columns = Math.floor(width / fontSize);
    const drops = Array(columns).fill(0);

    const draw = () => {
      // fade existing frame
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, width, height);

      // draw characters
      ctx.fillStyle = "#0F0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(char, x, y);

        // reset drop
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i]++;
        }
      }
    };

    const intervalId = setInterval(draw, speed);
    return () => clearInterval(intervalId);
  }, [size, fontSize, speed]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default MatrixRain;
