import Link from "next/link";
import Image from "next/image";

type Props = {
  iconOnly?: boolean;
  size?: number;
  textClassName?: string;
};

export function Logo({
  iconOnly = false,
  size = 32,
  textClassName = "text-deep-text",
}: Props) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span
        className="inline-block overflow-hidden rounded-[22%] ring-1 ring-white/10"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="DocuPeer"
          width={size * 3}
          height={size * 3}
          priority
          className="h-full w-full object-cover"
        />
      </span>
      {!iconOnly && (
        <span
          className={`font-sans text-[1.05rem] font-bold tracking-tight ${textClassName}`}
        >
          DocuPeer
        </span>
      )}
    </Link>
  );
}
