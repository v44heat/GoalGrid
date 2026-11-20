import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-turf-700 py-8 text-center text-sm text-chalk-faint">
      {APP_NAME}. A private league for friends.
    </footer>
  );
}
