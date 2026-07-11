"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User, Menu, X } from "lucide-react";
import { useUserAuth } from "../../../_utils/auth-context";
import PortalToggleButton from "./PortalToggleButton"

const navLinks = [
	{ label: "Overview", href: "/Dashboard" },
	{ label: "Members", href: "/MembersManager" },
	{ label: "Donations", href: "/DonationsManager" },
	{ label: "Events", href: "/EventsManager" },
	// { label: "Galleries", href: "/GalleryManager" },
	{ label: "Sponsors", href: "/SponsorsManager" },
	{ label: "Bulletins", href: "/BulletinsManager" },
	{ label: "Reports", href: "/Reports" },
	{ label: "FAQs", href: "/FaqsManager" },
];

export function Header() {
	const [menuOpen, setMenuOpen] = React.useState(false);
	const pathname = usePathname();
	const { user } = useUserAuth();

	return (
		<header className="sticky top-0 z-50 bg-[#556B2F] shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
			{/* Top bar: logo + brand + user */}
			<div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
				<Link
					href="/Dashboard"
					className="flex items-center gap-3 no-underline min-w-0"
				>
					<Image
						src="/pasoc_logo.png"
						alt="PASOC Logo"
						width={80}
						height={80}
						className="object-contain shrink-0"
					/>
					<span
						className="text-white leading-snug"
						style={{
							fontFamily: "var(--font-serif)",
							fontSize: "clamp(1rem, 2vw, 1.4rem)",
						}}
					>
						PASOC Admins
					</span>
				</Link>

				<div className="flex items-center gap-3 shrink-0">
					<PortalToggleButton />

					<Link
						href={user ? "/Profile" : "/Login"}
						title={user ? "Profile" : "Login"}
						className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
					>
						<User size={22} strokeWidth={1.8} />
					</Link>

					{/* Hamburger — white so it's visible on olive bg */}
					<button
						className="flex md:hidden items-center justify-center p-1 text-white bg-transparent border-none cursor-pointer"
						onClick={() => setMenuOpen((o) => !o)}
						aria-label="Toggle menu"
					>
						{menuOpen ? <X size={28} /> : <Menu size={28} />}
					</button>
				</div>
			</div>

			{/* Desktop nav */}
			<div className="max-w-7xl mx-auto px-6 w-full">
				<nav className="hidden md:flex w-full text-sm font-bold border-t border-white/20">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.label}
								href={link.href}
								className="flex-1 py-2.5 text-center whitespace-nowrap no-underline transition-all duration-150"
								style={{
									backgroundColor: isActive
										? "rgba(255,255,255,0.15)"
										: "transparent",
									color: isActive
										? "#ffffff"
										: "rgba(255,255,255,0.65)",
									borderBottom: isActive
										? "2px solid #c5d68a"
										: "2px solid transparent",
								}}
							>
								{link.label}
							</Link>
						);
					})}
				</nav>
			</div>

			{/* Mobile dropdown */}
			<nav
				className="md:hidden flex flex-col bg-[#3a4a20] overflow-hidden transition-[max-height,border-top-width] duration-300 ease-in-out"
				style={{ maxHeight: menuOpen ? "500px" : "0px", borderTopWidth: menuOpen ? "1px" : "0px", borderColor: "rgba(255,255,255,0.2)", borderTopStyle: "solid" }}
			>
				{navLinks.map((link) => {
					const isActive = pathname === link.href;
					return (
						<Link
							key={link.label}
							href={link.href}
							onClick={() => setMenuOpen(false)}
							className="px-6 py-3.5 no-underline font-bold text-[15px] border-b border-white/10 transition-colors duration-150"
							style={{
								color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)",
								backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
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
