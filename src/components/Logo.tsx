import { motion } from "framer-motion";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      {/* 🔥 Icon */}
      <motion.div
        initial={{ rotate: -10, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        whileHover={{ scale: 1.1, rotate: 3 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-brand"
          style={{ filter: "blur(10px)", opacity: 0.8 }}
        />

        {/* Main box */}
        <div
          className="relative w-full h-full rounded-xl bg-gradient-brand flex items-center justify-center font-black text-background shadow-lg"
          style={{ fontSize: size * 0.55 }}
        >
          M
        </div>

        {/* Pulse ring (connection vibe) */}
        <span className="absolute inset-0 rounded-xl animate-pulse-ring"></span>
      </motion.div>

      {/* 🔥 Text */}
      <motion.span
        className="font-black text-xl tracking-tight text-gradient"
        whileHover={{ scale: 1.05 }}
      >
        Mingle
      </motion.span>
    </div>
  );
}
