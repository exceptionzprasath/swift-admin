import logoBanner from "@/assets/CreatonsHR-Banner.png";

export function SwiftLogo({
  className = "",
}: {
  size?: number;
  showText?: boolean;
  className?: string;
  height?: number;
}) {
  return (
    <div className={`flex items-center justify-center overflow-hidden select-none bg-white py-1.5 px-3 rounded-xl shadow-xs ${className}`}>
      <img
        src={logoBanner}
        alt="CreatonsHR"
        className="h-8 sm:h-10 w-auto max-w-full object-contain mx-auto block"
        loading="eager"
      />
    </div>
  );
}

export const CreatonsLogo = SwiftLogo;

