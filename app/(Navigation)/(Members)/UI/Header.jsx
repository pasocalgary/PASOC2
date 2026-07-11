"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUserAuth } from "../../../_utils/auth-context";
import PortalToggleButton from "../../(Admin)/UI/PortalToggleButton";

const navLinks = [
	{ label: "Home", href: "/" },
	{ label: "Events", href: "/Events" },
	{ label: "Bulletins", href: "/Bulletins" },
	{ label: "PASOC in Motion", href: "/Motion" },
	{ label: "Sponsors", href: "/Sponsors" },
	{ label: "About", href: "/About" },
	{ label: "Donate", href: "/Donate" },
];

export function Header() {
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [hoveredNav, setHoveredNav] = React.useState(null);
	const [visible, setVisible] = React.useState(true);
	const lastScrollY = React.useRef(0);
	const menuOpenRef = React.useRef(false);
	const pathname = usePathname();
	const { user } = useUserAuth();

	React.useEffect(() => {
		menuOpenRef.current = menuOpen;
	}, [menuOpen]);

	React.useEffect(() => {
		const handleScroll = () => {
			const currentY = window.scrollY;
			if (currentY < 10 || currentY < lastScrollY.current) {
				setVisible(true);
			} else if (currentY > lastScrollY.current + 5 && !menuOpenRef.current) {
				setVisible(false);
			}
			lastScrollY.current = currentY;
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`
        sticky top-0 z-50
        bg-[#f5f5f4]
        shadow-[0_4px_10px_rgba(0,0,0,0.2)]
        border-b-4 border-[#556B2F]
        transition-transform duration-300 ease-in-out
        ${visible ? "translate-y-0" : "-translate-y-[110%]"}
      `}
		>
			<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
				{/* Brand: logo + title */}
				<Link
					href="/"
					className="flex items-center gap-2 no-underline flex-1 min-w-0 justify-center md:justify-start"
				>
					<Image
						src="/pasoc_logo.png"
						alt="PASOC Logo"
						width={100}
						height={100}
						className="object-contain shrink-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-25 lg:h-25"
					/>
					<span
						className=" text-black leading-snug wrap-break-word"
						style={{
							fontFamily: "var(--font-serif)",
							fontSize: "clamp(1rem, 2.5vw, 1.75rem)",
						}}
					>
						Pangasinan Society of Calgary
					</span>
				</Link>

				{/* Right-side actions */}
				<div className="flex items-center gap-2 shrink-0">
					<PortalToggleButton />

					{user ? (
						<Link
							href={`/Profile`}
							className="p-2 rounded-full bg-gray-200 text-zinc-600 hover:bg-gray-300 transition"
						>
							<User size={20} />
						</Link>
					) : (
						<Link
							href="/Login"
							title="Login"
							className="flex items-center p-1 rounded-lg text-zinc-500 no-underline transition-transform duration-200 hover:scale-110"
						>
							<p className="hidden sm:inline text-sm font-medium">
								Login
							</p>
						</Link>
					)}

					{/* Hamburger for mobile */}
					<button
						className="flex md:hidden items-center justify-center p-1 text-[#556B2F] bg-transparent border-none cursor-pointer"
						onClick={() => setMenuOpen((o) => !o)}
						aria-label="Toggle menu"
					>
						{menuOpen ? <X size={32} /> : <Menu size={32} />}
					</button>
				</div>
			</div>

			{/* Desktop nav - constrained to max-w-7xl*/}
			<div className="max-w-7xl mx-auto px-6 w-full">
				<nav className="hidden md:flex w-full text-sm lg:text-lg font-bold">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						const isHovered = hoveredNav === link.label;
						return (
							<Link
								key={link.label}
								href={link.href}
								className="flex-1 py-1.5 lg:py-2.5 text-center whitespace-nowrap no-underline transition-all duration-200"
								style={{
									backgroundColor: isHovered && !isActive ? "#556B2F" : "transparent",
									color: isActive ? "#556B2F" : isHovered ? "#ffffff" : "#556B2F",
									borderBottom: isActive ? "3px solid #556B2F" : "3px solid transparent",
									fontWeight: isActive ? "800" : undefined,
								}}
								onMouseEnter={() => setHoveredNav(link.label)}
								onMouseLeave={() => setHoveredNav(null)}
							>
								{link.label}
							</Link>
						);
					})}
				</nav>
			</div>

			{/* Mobile dropdown menu */}
			<nav
				className="md:hidden flex flex-col border-[#556B2F] bg-[#f5f5f4] overflow-hidden transition-[max-height,border-top-width] duration-300 ease-in-out"
				style={{ maxHeight: menuOpen ? "500px" : "0px", borderTopWidth: menuOpen ? "2px" : "0px" }}
			>
				{navLinks.map((link) => {
					const isActive = pathname === link.href;
					return (
						<Link
							key={link.label}
							href={link.href}
							onClick={() => setMenuOpen(false)}
							className="px-6 py-3.5 no-underline font-bold text-[17px] border-b border-stone-300 transition-colors duration-150 hover:bg-[#556B2F] hover:text-white"
							style={{
								backgroundColor: isActive ? "#556B2F" : undefined,
								color: isActive ? "#ffffff" : "#556B2F",
							}}
						>
							{link.label}
						</Link>
					);
				})}
			</nav>
		</header>
	);
}
