import React from 'react';
import { motion } from 'framer-motion';

interface FinancialBar3DProps {
  children: React.ReactNode;
  depth: number; // 0 = front, 1 = second layer, 2 = third layer, etc.
  isActive?: boolean;
  className?: string;
}

export const FinancialBar3D: React.FC<FinancialBar3DProps> = ({
  children,
  depth,
  isActive = false,
  className = ''
}) => {
  // Calculate 3D positioning and styling based on depth
  const get3DStyle = (layerDepth: number) => {
    const baseZ = 0;
    const zOffset = layerDepth * 20; // Each layer is 20px deeper
    const yOffset = layerDepth * 8; // Each layer is 8px lower
    const scale = 1 - (layerDepth * 0.05); // Each layer is 5% smaller
    const opacity = 1 - (layerDepth * 0.15); // Each layer is 15% more transparent
    
    return {
      transform: `translateZ(${zOffset}px) translateY(${yOffset}px) scale(${scale})`,
      opacity: Math.max(0.3, opacity),
      zIndex: 10 - layerDepth,
    };
  };

  // 3D box shadow effect - reduced shadows
  const getBoxShadow = (layerDepth: number) => {
    const shadowIntensity = 8 + (layerDepth * 4);
    const shadowBlur = 6 + (layerDepth * 2);
    
    return {
      boxShadow: `
        ${shadowIntensity}px ${shadowIntensity}px ${shadowBlur}px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.05)
      `,
    };
  };

  // Accordion folding effect
  const getAccordionTransform = (layerDepth: number) => {
    if (layerDepth === 0) return { rotateX: 0 };
    
    // Each layer folds down more
    const foldAngle = layerDepth * 8; // 8 degrees per layer
    return { 
      rotateX: foldAngle,
      transformOrigin: 'top center',
    };
  };

  return (
    <motion.div
      className={`relative ${className}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
      initial={{ 
        ...get3DStyle(depth),
        ...getAccordionTransform(depth),
      }}
      animate={{ 
        ...get3DStyle(depth),
        ...getAccordionTransform(depth),
      }}
      transition={{
        duration: 0.6,
        ease: [0.4, 0.0, 0.2, 1],
        delay: depth * 0.1, // Staggered animation
      }}
      whileHover={{
        ...get3DStyle(Math.max(0, depth - 1.5)), // Bring forward more on hover
        ...getAccordionTransform(Math.max(0, depth - 1.5)),
        scale: 1.02, // Slight scale up
        transition: { duration: 0.3, ease: "easeOut" }
      }}
    >
      {/* 3D Container */}
      <div
        className="relative bg-white rounded-lg border border-gray-200 overflow-hidden"
        style={{
          ...getBoxShadow(depth),
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      >
        {/* Top face (main content) */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Right side face (3D depth) */}
        <div
          className="absolute top-0 right-0 w-4 h-full bg-gradient-to-b from-gray-100 to-gray-200 opacity-60"
          style={{
            transform: 'rotateY(90deg) translateZ(20px)',
            transformOrigin: 'right center',
          }}
        />
        
        {/* Bottom face (3D depth) */}
        <div
          className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-gray-100 to-gray-200 opacity-40"
          style={{
            transform: 'rotateX(90deg) translateZ(20px)',
            transformOrigin: 'bottom center',
          }}
        />
        
        {/* Simple accordion fold lines */}
        {depth > 0 && (
          <>
            {/* Top fold line */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5 bg-gray-400"
              style={{
                transform: 'rotateX(-5deg)',
                transformOrigin: 'top center',
              }}
            />
            
            {/* Left diagonal line */}
            <div
              className="absolute -bottom-1 left-0 w-1 h-3 bg-gray-400"
              style={{
                transform: 'rotate(45deg)',
                transformOrigin: 'bottom left',
              }}
            />
            
            {/* Right diagonal line */}
            <div
              className="absolute -bottom-1 right-0 w-1 h-3 bg-gray-400"
              style={{
                transform: 'rotate(-45deg)',
                transformOrigin: 'bottom right',
              }}
            />
            
            {/* Center diagonal line */}
            <div
              className="absolute -bottom-1 left-1/2 w-0.5 h-2 bg-gray-400"
              style={{
                transform: 'translateX(-50%) rotate(45deg)',
                transformOrigin: 'bottom center',
              }}
            />
          </>
        )}
      </div>
      
      {/* Depth indicator line */}
      <div
        className="absolute -bottom-2 left-4 right-4 h-0.5 bg-gray-300 opacity-30"
        style={{
          transform: `translateZ(${depth * 10}px)`,
        }}
      />
      
    </motion.div>
  );
};
