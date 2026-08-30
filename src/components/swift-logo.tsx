import logoBanner from "@/assets/swift-logo-banner.jpeg";

export function SwiftLogo({
  className = "",
}: {
  size?: number;
  showText?: boolean;
  className?: string;
  height?: number;
}) {
  return (
    <div className={`w-full flex items-center justify-center overflow-hidden select-none bg-white py-2 px-3 ${className}`}>
      <img
        src={logoBanner}
        alt="SWIFT HRMS"
        className="h-12 sm:h-24 w-auto max-w-full object-contain mx-auto block"
        loading="eager"
      />
    </div>
  );
}

