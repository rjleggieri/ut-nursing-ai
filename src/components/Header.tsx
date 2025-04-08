import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="w-full bg-white shadow-sm py-3 mb-6">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img 
            src="/assets/ut-banner.png"
            alt="UT Austin School of Nursing Logo" 
            className="h-16"
          />
        </Link>
        <nav className="hidden md:flex space-x-6 font-medium">
          <Link 
            to="/" 
            className="text-utexas-navy hover:text-utexas-orange transition duration-200"
          >
            Student Interface
          </Link>
          <Link 
            to="/faculty-dashboard" 
            className="text-utexas-navy hover:text-utexas-orange transition duration-200"
          >
            Faculty Dashboard
          </Link>
        </nav>
        <div className="md:hidden">
          {/* Mobile menu button would go here */}
        </div>
      </div>
    </header>
  );
};

export default Header;
