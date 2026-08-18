import Link from "next/link";
import Image from "next/image";

type Props = {
  iconOnly?: boolean;
  size?: number;
  textClassName?: string;
};

export function Logo({
  iconOnly = false,
  size = 44,
  textClassName = "text-deep-text",
}: Props) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <span
        className="inline-flex items-center justify-center overflow-hidden rounded-[22%] bg-deep-panel2/70 ring-1 ring-black/5 shadow-[0_8px_20px_rgba(16,24,40,0.06)]"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="DocuPeer"
          width={size * 3}
          height={size * 3}
          priority
          className="h-[96%] w-[96%] object-contain"
        />
      </span>
      {!iconOnly && (
        <span
          className={`font-sans text-[1.22rem] font-bold tracking-tight sm:text-[1.34rem] ${textClassName}`}
        >
          DocuPeer
        </span>
      )}
    </Link>
  );
}
