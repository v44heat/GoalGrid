import { APP_NAME } from "@/lib/constants";
import { InstallApp } from "@/components/pwa/InstallApp";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-turf-700 py-8 text-center text-sm text-chalk-faint">
      <InstallApp />
      {APP_NAME}. A private league for friends.
    </footer>
  );
}
