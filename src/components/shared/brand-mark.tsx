import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_ICON_SRC, ui } from "@/lib/ui";

type BrandMarkProps = {
  className?: string;
  size?: number;
  alt?: string;
};

/** شعار التطبيق — صورة بزوايا منحنية */
export function BrandMark({
  className,
  size = 32,
  alt = "نظام تتبع الأدوات",
}: BrandMarkProps) {
  return (
    <Image
      src={APP_ICON_SRC}
      alt={alt}
      width={size}
      height={size}
      priority
      className={cn(ui.brandImage, className)}
      style={{ width: size, height: size }}
    />
  );
}
