import { motion } from "framer-motion";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ rotate: -10, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 rounded-xl bg-gradient-brand"
          style={{ filter: "blur(8px)", opacity: 0.7 }}
        />
        <div className="relative w-full h-full rounded-xl bg-gradient-brand flex items-center justify-center font-black text-background"
          style={{ fontSize: size * 0.55 }}>
          M
        </div>
      </motion.div>
      <span className="font-black text-xl tracking-tight">Mingle</span>
    </div>
  );
}