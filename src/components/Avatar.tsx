import { initials } from "@/lib/utils";

type Props = {
  name?: string | null;
  surname?: string | null;
  username?: string;
  avatarUrl?: string | null;
  size?: number;
  title?: string;
};

export default function Avatar({ name, surname, username, avatarUrl, size = 28, title }: Props) {
  const label = initials(name, surname, (username ?? "?").charAt(0).toUpperCase());
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={username ?? "avatar"}
        title={title}
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      title={title}
      className="inline-flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ring-1 ring-black/5"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {label}
    </span>
  );
}
