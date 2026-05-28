import Image from "next/image";

type SkinImageProps = {
  src?: string | null;
  alt: string;
  variant?: "thumbnail" | "preview" | "grid" | "values";
};

function NoImagePlaceholder({ variant }: { variant: SkinImageProps["variant"] }) {
  if (variant === "preview") {
    return (
      <div className="flex h-60 w-full max-w-[240px] items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900">
        <span className="text-sm text-zinc-500">No Image</span>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-zinc-700/80 bg-zinc-950 text-xs text-zinc-500">
        No Image
      </div>
    );
  }

  if (variant === "values") {
    return <div className="h-full w-full bg-zinc-900" aria-hidden="true" />;
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

  if (variant === "grid") {
    return (
      <div className="relative h-full w-full">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain p-1"
          sizes="120px"
          unoptimized
        />
      </div>
    );
  }

  if (variant === "values") {
    return (
      <div className="relative h-full w-full">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain p-0.5"
          sizes="48px"
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
