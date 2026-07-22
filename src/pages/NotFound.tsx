import { Home } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-utexas-gray">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <h1 className="mb-4 text-6xl font-bold text-utexas-orange">404</h1>
        <p className="mb-6 text-xl text-utexas-navy">Page not found</p>
        <p className="mb-8 text-gray-600">The requested CareSpeak page does not exist.</p>
        <Button asChild>
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Return home
          </Link>
        </Button>
      </div>
    </div>
  );
}
