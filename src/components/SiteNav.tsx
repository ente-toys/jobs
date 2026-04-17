import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { enteWordmarkUrl } from "../lib/assets";

type SiteNavItem =
  | { href: string; label: string }
  | { label: string; to: string };

const navItems: SiteNavItem[] = [
  { label: "Home", href: "https://ente.com/" },
  { label: "Jobs", to: "/" },
  { label: "About", href: "https://ente.com/about" },
  { label: "Blog", href: "https://ente.com/blog" },
  { label: "Download", href: "https://ente.com/download" },
];

const mobileNavQuery = "(max-width: 640px)";
const navTransition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function SiteNav() {
  const [isMobileNav, setIsMobileNav] = useState(
    () => typeof window !== "undefined" && window.matchMedia(mobileNavQuery).matches,
  );
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueryList = window.matchMedia(mobileNavQuery);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileNav(event.matches);
    };

    setIsMobileNav(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileNav) {
      setIsNavOpen(false);
    }
  }, [isMobileNav]);

  useEffect(() => {
    if (!isNavOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNavOpen]);

  const closeNav = () => {
    if (isMobileNav) {
      setIsNavOpen(false);
    }
  };

  return (
    <motion.header
      className={`site-nav ${isNavOpen ? "is-open" : ""}`}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={navTransition}
    >
      <div className="site-nav-top">
        <Link
          aria-label="Ente home"
          className="site-nav-brand"
          onClick={closeNav}
          to="/"
        >
          <img alt="Ente" src={enteWordmarkUrl} />
        </Link>
        <button
          aria-controls="site-primary-nav"
          aria-expanded={isNavOpen}
          aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
          className="site-nav-toggle"
          onClick={() => {
            setIsNavOpen((current) => !current);
          }}
          type="button"
        >
          <span aria-hidden="true" className="site-nav-toggle-icon">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
      {!isMobileNav || isNavOpen ? (
        <nav aria-label="Primary" className="site-nav-links" id="site-primary-nav">
          {navItems.map((item) => (
            "to" in item ? (
              <Link
                key={item.label}
                className="site-nav-link"
                onClick={closeNav}
                to={item.to}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                className="site-nav-link"
                href={item.href}
                onClick={closeNav}
                rel="noreferrer"
                target="_blank"
              >
                {item.label}
              </a>
            )
          ))}
        </nav>
      ) : null}
    </motion.header>
  );
}
