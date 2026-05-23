export default function UserAvatar({ user }) {
  const name = user?.displayName || user?.email || 'U';
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-sm font-bold text-white shadow-md">
      {initial}
    </div>
  );
}
