import Image from "next/image";

type SkinImageProps = {
  src?: string | null;
  alt: string;
  variant?: "thumbnail" | "preview";
};

function NoImagePlaceholder({ variant }: { variant: "thumbnail" | "preview" }) {
  if (variant === "preview") {
    return (
      <div className="flex h-60 w-full max-w-[240px] items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900">
        <span className="text-sm text-zinc-500">No Image</span>
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-900 text-center text-[8px] leading-tight text-zinc-500"
      title="No Image"
    >
      No Image
    </div>
  );
}

export function SkinImage({ src, alt, variant = "thumbnail" }: SkinImageProps) {
  if (!src?.trim()) {
    return <NoImagePlaceholder variant={variant} />;
  }

  if (variant === "preview") {
    return (
      <div className="relative mx-auto h-60 w-full max-w-[240px]">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          className="object-contain"
          sizes="240px"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        sizes="40px"
        unoptimized
      />
    </div>
  );
}
